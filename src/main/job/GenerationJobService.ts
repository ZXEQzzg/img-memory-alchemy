import { BrowserWindow, app } from 'electron'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { GenerationJob } from './GenerationJob'
import { checkPrompt, buildFallbackPrompt } from './promptGuard'
import type { ModelGateway, ImageDescription, GeneratedPrompt, ModerationResult, GeneratedImage } from '../gateway/ModelGateway'
import type { PhotoRepository, SampleOptions } from '../photo/PhotoRepository'
import type {
  AppConfig,
  JobState,
  JobStateEvent,
  JobStartOptions,
  ProvenanceRecord,
  JobError,
  ModelUsage,
  GenerationUsage,
  GenerationDebug,
  CreativityLevel,
  QualityVerdict
} from '../../shared/types/api'
import { v4 as uuidv4 } from 'uuid'
import type { ProvenanceStore } from '../store/ProvenanceStore'

/** 提示词守卫最多尝试次数 */
const MAX_PROMPT_ATTEMPTS = 2
/** 图像生成最多尝试次数（含相关性自检不通过后的重试） */
const MAX_IMAGE_ATTEMPTS = 2
/** 内容审查最多尝试次数（不通过时会带着原因重新生成提示词） */
const MAX_MODERATION_ATTEMPTS = 2

/**
 * GenerationJobService - 在主进程中管理单次生成任务的完整生命周期。
 *
 * 功能：
 * 1. 接收 job:start，创建新 GenerationJob
 * 2. 旧 Job 取消与新 Job 结果丢弃
 * 3. 五段流水线驱动（含提示词守卫、生成后相关性自检）
 * 4. IPC 状态推送与事件广播
 * 5. 上传确认事件（Real Mode）
 * 6. API Key 二次校验
 * 7. 错误映射与重试逻辑
 * 8. 生成结果持久化 + 全链路中间产物记录（溯源 / 排障）
 */
export class GenerationJobService {
  private activeJob: GenerationJob | null = null
  private lastBatch: string[] = []
  private pendingPhotos: { path: string; filename: string }[] = []
  private listeners: Array<(event: JobStateEvent) => void> = []

  constructor(
    private readonly gateway: ModelGateway,
    private readonly photoRepository: PhotoRepository,
    private readonly getWindow: () => BrowserWindow | null,
    private readonly configProvider?: () => AppConfig,
    private readonly provenanceStore?: ProvenanceStore
  ) {}

  onEmit(listener: (event: JobStateEvent) => void): void {
    this.listeners.push(listener)
  }

  cancelCurrent(): void {
    if (this.activeJob) {
      this.cancel(this.activeJob.jobId)
    }
  }

  private emit(event: JobStateEvent): void {
    const win = this.getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('job:state-change', event)
    }
    for (const listener of this.listeners) {
      listener(event)
    }
  }

  async start(options: JobStartOptions): Promise<string> {
    // 取消旧 Job
    if (this.activeJob?.isActive()) {
      this.activeJob.cancel()
      this.emit({ jobId: this.activeJob.jobId, state: 'cancelled' })
    }

    // API Key 二次校验
    const mode = this.configProvider?.().mode || 'demo'
    if (mode === 'real') {
      const qwenKey = process.env['QWEN_API_KEY']
      const deepSeekKey = process.env['DEEPSEEK_API_KEY']
      if (!qwenKey || !deepSeekKey) {
        const job = new GenerationJob()
        this.activeJob = job
        job.transition('selecting')
        job.transition('failed')
        this.emit({
          jobId: job.jobId,
          state: 'failed',
          error: { stage: 'selecting', message: 'API 配置不完整，请检查 QWEN_API_KEY 和 DEEPSEEK_API_KEY' }
        })
        return job.jobId
      }
    }

    const job = new GenerationJob()
    this.activeJob = job

    // 异步执行流水线
    this.runPipeline(job, options).catch((err: unknown) => {
      console.error('[GenerationJobService] Unhandled pipeline error:', err)
    })

    return job.jobId
  }

  cancel(jobId: string): void {
    if (this.activeJob?.jobId === jobId) {
      this.activeJob.cancel()
      this.emit({ jobId, state: 'cancelled' })
    }
  }

  /**
   * 重试：复用上一次选中 photos，从理解阶段重新跑一遍（不重新抽图）
   */
  async retry(): Promise<string> {
    if (!this.activeJob) {
      throw new Error('No active job to retry')
    }

    const job = this.activeJob
    job.reset()
    this.activeJob = job

    const options: JobStartOptions = { referenceCount: this.configProvider?.().referenceCount ?? 'multi' }
    this.runPipeline(job, options, this.pendingPhotos).catch((err: unknown) => {
      console.error('[GenerationJobService] Retry error:', err)
    })

    return job.jobId
  }

  /**
   * 五段流水线主流程。
   * @param cachedPhotos 传入时跳过抽图（供重试复用上一次的素材）
   */
  private async runPipeline(
    job: GenerationJob,
    options: JobStartOptions,
    cachedPhotos?: { path: string; filename: string }[]
  ): Promise<void> {
    const { jobId } = job
    const config = this.configProvider?.()
    const mode = config?.mode ?? 'demo'
    const creativity: CreativityLevel = config?.creativity ?? 'balanced'
    const qualityGuard = config?.qualityGuard ?? true

    const debug: GenerationDebug = {}
    const usageRecords: ModelUsage[] = []

    // ---- 1. selecting ----
    job.transition('selecting')
    this.emit({ jobId, state: 'selecting' })

    let photos: { path: string; filename: string }[]

    if (cachedPhotos && cachedPhotos.length > 0) {
      photos = cachedPhotos
    } else {
      const count = options.referenceCount === 'multi' ? (Math.random() < 0.5 ? 2 : 3) : 1
      const sampleCount = count as SampleOptions['count']
      const sampled = this.photoRepository.sample({ count: sampleCount, lastBatch: this.lastBatch })

      if (sampled.length === 0) {
        job.transition('failed')
        this.emit({
          jobId,
          state: 'failed',
          error: { stage: 'selecting', message: '没有可用的照片，请先在控制页添加目录' }
        })
        return
      }

      photos = sampled.map((p) => ({ path: p.path, filename: p.filename }))
      this.pendingPhotos = photos

      if (!this.isCurrentJob(jobId)) return

      // ---- 上传确认事件（Real Mode）----
      if (mode === 'real') {
        this.emit({ jobId, state: 'selecting', progress: -1 })
      }
    }

    // ---- 2. describing ----
    job.transition('describing')
    this.emit({ jobId, state: 'describing' })

    let descriptions: ImageDescription[] = []
    try {
      const r = await this.gateway.describeImages(photos.map((p) => p.path), this.makeSignal(job))
      descriptions = r.data
      usageRecords.push(r.usage)
      if (r.raw) debug.rawDescriptions = [r.raw]
    } catch (err) {
      if (!this.isCurrentJob(jobId)) return
      job.transition('failed')
      this.emit({ jobId, state: 'failed', error: this.mapError(err, 'describing') })
      return
    }
    debug.descriptions = descriptions

    if (!this.isCurrentJob(jobId)) return

    // ---- 3. prompting（提示词守卫 + 重试）----
    job.transition('prompting')
    this.emit({ jobId, state: 'prompting' })

    let generatedPrompt: GeneratedPrompt | null = null
    let blockingIssues: string[] = []
    let advisoryIssues: string[] = []
    let promptRequestFailed = false

    for (let attempt = 1; attempt <= MAX_PROMPT_ATTEMPTS; attempt += 1) {
      try {
        const r = await this.gateway.createPrompt(descriptions, this.makeSignal(job), {
          creativity,
          // 重试时把上一次的失败原因回传给模型，避免无效重试
          previousIssues: attempt > 1 ? blockingIssues : undefined
        })
        usageRecords.push(r.usage)
        if (r.raw) debug.rawPromptOutput = r.raw

        const check = checkPrompt(r.data)
        blockingIssues = check.blocking
        advisoryIssues = check.advisory

        if (blockingIssues.length === 0) {
          generatedPrompt = r.data
          break
        }
        console.warn(`[GenerationJobService] 提示词第 ${attempt} 次未通过守卫：`, blockingIssues)
      } catch (err) {
        // 脑洞模型请求失败（网络/超时）时降级为本地兜底模板，不中断流水线
        promptRequestFailed = true
        console.warn('[GenerationJobService] 提示词生成请求失败，将使用兜底模板：', this.mapError(err, 'prompting').message)
        break
      }
    }

    // 兜底：守卫连续未通过或请求失败时，改用本地模板
    let usedFallbackPrompt = false
    if (!generatedPrompt) {
      generatedPrompt = buildFallbackPrompt(descriptions)
      usedFallbackPrompt = true
      if (promptRequestFailed) advisoryIssues.push('脑洞模型请求失败，已用本地兜底模板')
      console.warn('[GenerationJobService] 提示词未产出，已改用兜底模板')
    }

    debug.promptIssues = blockingIssues
    debug.promptAdvisory = advisoryIssues
    debug.usedFallbackPrompt = usedFallbackPrompt

    if (!this.isCurrentJob(jobId)) return

    // ---- 4. moderating（含内容审查纠正重试）----
    job.transition('moderating')
    this.emit({ jobId, state: 'moderating' })

    let modResult: ModerationResult | null = null
    let moderationRaw: string | undefined
    let moderationSkipped = false

    for (let attempt = 1; attempt <= MAX_MODERATION_ATTEMPTS; attempt += 1) {
      try {
        const r = await this.gateway.moderatePrompt(generatedPrompt, this.makeSignal(job))
        modResult = r.data
        moderationRaw = r.raw
        usageRecords.push(r.usage)
      } catch (err) {
        // 审查服务不可用（网络/超时）时降级放行，不阻塞整个流程
        moderationSkipped = true
        console.warn('[GenerationJobService] 内容审查服务不可用，跳过审查：', this.mapError(err, 'moderating').message)
        break
      }

      if (modResult.passed) break

      console.warn(`[GenerationJobService] 内容审查第 ${attempt} 次未通过：${modResult.reason ?? '未给出原因'}`)
      if (attempt >= MAX_MODERATION_ATTEMPTS) break

      // 纠正：带着审查拒绝原因重新生成提示词，再审查一次
      try {
        const r = await this.gateway.createPrompt(descriptions, this.makeSignal(job), {
          creativity,
          previousIssues: [`内容安全审查未通过（${modResult.reason ?? '含不适宜内容'}），请避开该问题重新构思`]
        })
        usageRecords.push(r.usage)
        if (r.raw) debug.rawPromptOutput = r.raw

        const check = checkPrompt(r.data)
        blockingIssues = check.blocking
        advisoryIssues = check.advisory
        if (check.blocking.length > 0) break

        generatedPrompt = r.data
      } catch (err) {
        console.warn('[GenerationJobService] 审查未通过后重新生成提示词失败：', err)
        break
      }

      if (!this.isCurrentJob(jobId)) return
    }

    debug.moderation = {
      passed: moderationSkipped ? true : modResult?.passed ?? false,
      skipped: moderationSkipped,
      reason: moderationSkipped ? '审查服务不可用，已跳过（降级放行）' : modResult?.reason,
      raw: moderationRaw
    }

    if (!moderationSkipped && (!modResult || !modResult.passed)) {
      job.transition('failed')
      this.emit({
        jobId,
        state: 'failed',
        error: {
          stage: 'moderating',
          message: `内容安全审查未通过${modResult?.reason ? `：${modResult.reason}` : '（模型未给出原因）'}`,
          code: 'content_rejected'
        }
      })
      return
    }

    if (!this.isCurrentJob(jobId)) return

    // ---- 5. generating（相关性自检 + 重试）----
    job.transition('generating')
    this.emit({ jobId, state: 'generating', progress: 0 })

    const referencePaths = photos.map((p) => p.path)
    let generatedImage: GeneratedImage | null = null
    let quality: QualityVerdict = { verdict: 'unknown', reason: '未启用质量守卫' }
    let imageAttempts = 0

    for (let attempt = 1; attempt <= MAX_IMAGE_ATTEMPTS; attempt += 1) {
      imageAttempts = attempt

      let image!: GeneratedImage
      try {
        const r = await this.gateway.generateImage(
          generatedPrompt,
          photos[0].path,
          this.makeSignal(job),
          { creativity }
        )
        image = r.data
        usageRecords.push(r.usage)
      } catch (err) {
        const mapped = this.mapError(err, 'generating')
        console.warn(`[GenerationJobService] 第 ${attempt} 次生成失败：${mapped.message}`)
        if (attempt >= MAX_IMAGE_ATTEMPTS) {
          if (!this.isCurrentJob(jobId)) return
          job.transition('failed')
          this.emit({ jobId, state: 'failed', error: mapped })
          return
        }
        continue
      }

      // 校验确实返回了图片（data URL 非空且格式正确）
      if (!image.dataUrl || !image.dataUrl.startsWith('data:image/')) {
        console.warn(`[GenerationJobService] 第 ${attempt} 次生成返回空/无效图片`)
        if (attempt >= MAX_IMAGE_ATTEMPTS) {
          if (!this.isCurrentJob(jobId)) return
          job.transition('failed')
          this.emit({ jobId, state: 'failed', error: { stage: 'generating', message: '图片生成返回空结果', code: 'unknown' } })
          return
        }
        continue
      }

      generatedImage = image

      if (!qualityGuard) break

      try {
        quality = await this.gateway.verifyRelevance(image.dataUrl, referencePaths, this.makeSignal(job))
      } catch (err) {
        console.warn('[GenerationJobService] 相关性校验失败：', err)
        quality = { verdict: 'unknown', reason: '相关性校验失败' }
        break
      }

      if (quality.verdict !== 'identical' && quality.verdict !== 'unrelated') break
      if (attempt >= MAX_IMAGE_ATTEMPTS) break

      if (!this.isCurrentJob(jobId)) return
      console.warn(`[GenerationJobService] 第 ${attempt} 次生成被判定为 ${quality.verdict}（${quality.reason}），重试`)
    }

    debug.quality = quality
    debug.imageAttempts = imageAttempts

    if (!generatedImage) return

    if (!this.isCurrentJob(jobId)) return

    // ---- succeeded ----
    this.lastBatch = photos.map((p) => p.path)
    job.transition('succeeded')

    const recordId = uuidv4()
    const provenance: ProvenanceRecord = {
      id: recordId,
      createdAt: new Date().toISOString(),
      theme: generatedPrompt.theme,
      promptText: generatedPrompt.text,
      promptStyle: generatedPrompt.style,
      sourcePhotos: photos,
      generatedImagePath: this.persistGeneratedImage(generatedImage.dataUrl, recordId) ?? undefined,
      isDemoGeneration: mode === 'demo',
      usage: this.aggregateUsage(usageRecords),
      debug
    }

    if (this.provenanceStore) {
      this.provenanceStore.save(provenance).catch((err) => {
        console.error('[GenerationJobService] Failed to save provenance:', err)
      })
    }

    this.emit({
      jobId,
      state: 'succeeded',
      result: { imageDataUrl: generatedImage.dataUrl, provenance }
    })
  }

  private makeSignal(job: GenerationJob): AbortSignal {
    const timeoutSignal = AbortSignal.timeout(60_000)
    if (typeof AbortSignal.any === 'function') {
      return AbortSignal.any([job.signal, timeoutSignal])
    }
    return job.signal
  }

  private isCurrentJob(jobId: string): boolean {
    return this.activeJob?.jobId === jobId
  }

  private aggregateUsage(records: ModelUsage[]): GenerationUsage {
    const sum = (f: (r: ModelUsage) => number): number => records.reduce((s, r) => s + (f(r) || 0), 0)
    return {
      promptTokens: sum((r) => r.inputTokens),
      completionTokens: sum((r) => r.outputTokens),
      totalTokens: sum((r) => r.totalTokens),
      inputImages: sum((r) => r.inputImages),
      outputImages: sum((r) => r.outputImages),
      stages: records
    }
  }

  private mapError(err: unknown, stage: string): JobError {
    if (err instanceof Error) {
      if (err.name === 'AbortError' || err.message.includes('aborted')) {
        return { stage: stage as JobState, message: '操作已取消', code: 'cancelled' }
      }
      if (err.name === 'TimeoutError' || err.message.includes('timeout') || err.message.includes('timed out')) {
        return { stage: stage as JobState, message: '请求超时（60秒），请重试', code: 'timeout' }
      }
      if (err.message.includes('404') || err.message.includes('Not Found')) {
        return { stage: stage as JobState, message: '资源未找到', code: 'not_found' }
      }
      if (err.message.includes('403') || err.message.includes('forbidden') || err.message.includes('content')) {
        return { stage: stage as JobState, message: '内容被拒绝', code: 'content_rejected' }
      }
      if (err.message.includes('fetch failed') || err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND')) {
        return { stage: stage as JobState, message: '网络连接失败，请检查网络', code: 'network' }
      }
    }
    return { stage: stage as JobState, message: err instanceof Error ? err.message : '未知错误', code: 'unknown' }
  }

  /**
   * 将生成图片持久化到 userData/generated 目录，返回文件路径。
   * 用于历史溯源展示（不覆盖原始照片）。
   */
  private persistGeneratedImage(dataUrl: string, id: string): string | null {
    try {
      const match = dataUrl.match(/^data:(image\/[\w.+-]+);base64,(.+)$/)
      if (!match) return null
      const mime = match[1]
      const ext = mime === 'image/svg+xml' ? 'svg' : mime === 'image/jpeg' ? 'jpg' : (mime.split('/')[1] || 'png')
      const dir = join(app.getPath('userData'), 'generated')
      mkdirSync(dir, { recursive: true })
      const filePath = join(dir, `${id}.${ext}`)
      writeFileSync(filePath, Buffer.from(match[2], 'base64'))
      return filePath
    } catch (err) {
      console.error('[GenerationJobService] persistGeneratedImage failed:', err)
      return null
    }
  }
}
