// ============================================================
// 共享类型定义 — 主进程 & 渲染进程共用
// ============================================================

// ---------- 照片相关 ----------

export interface PhotoRecord {
  path: string
  filename: string
  size: number
  isValid: boolean
  isExcluded: boolean
}

export interface DirectoryEntry {
  path: string
  validCount: number
  isAccessible: boolean
  errorReason?: string
}

export interface DirectoryScanResult {
  entry: DirectoryEntry
  photos: PhotoRecord[]
}

export interface ExclusionEntry {
  path: string
  type: 'folder' | 'file'
}

// ---------- 图片理解结果 ----------

export interface ImageDescription {
  subjects: string[]
  environment: string
  colors: string[]
  mood: string
  details: string[]
}

// ---------- 应用配置 ----------

export interface WidgetBounds {
  x: number
  y: number
  width: number
  height: number
}

/**
 * 创作尺度：
 * - faithful 保守：最大程度保留原图主体与场景，只做风格化提升
 * - balanced 平衡：保留核心主体，可自由改变风格/光线/组合
 * - wild     放飞：允许超现实重构，但仍须保留可识别元素
 */
export type CreativityLevel = 'faithful' | 'balanced' | 'wild'

export interface AppConfig {
  mode: 'demo' | 'real'
  skin: 'pixel' | 'magic' | 'paper' | 'wish' | 'battery' | 'spider'
  referenceCount: 1 | 'multi'
  creativity: CreativityLevel
  qualityGuard: boolean
  /** 是否显示桌宠（钥匙 + 宝箱） */
  widgetVisible: boolean
  /** 桌宠是否置顶（始终显示在其他窗口之上） */
  widgetAlwaysOnTop: boolean
  /** 生成图片的默认保存目录（空 = 系统图片目录\记忆炼金） */
  saveDirectory?: string
  directories: string[]
  exclusions: Array<{ path: string; type: 'folder' | 'file' }>
  triggerBounds: WidgetBounds
  dropzoneBounds: WidgetBounds
  dropzoneScale?: number
}

// ---------- 生成任务 ----------

export type JobState =
  | 'idle'
  | 'selecting'
  | 'describing'
  | 'prompting'
  | 'moderating'
  | 'generating'
  | 'succeeded'
  | 'failed'
  | 'cancelled'

export interface JobStateEvent {
  jobId: string
  state: JobState
  progress?: number
  error?: { stage: JobState; message: string; code?: 'network' | 'timeout' | 'not_found' | 'content_rejected' | 'cancelled' | 'unknown' }
  result?: {
    imageDataUrl: string
    provenance: ProvenanceRecord
  }
}

export interface JobStartOptions {
  referenceCount: 1 | 'multi'
}

// ---------- 用量统计 ----------

export interface ModelUsage {
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  imageTokens: number
  inputImages: number
  outputImages: number
}

export interface GenerationUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  inputImages: number
  outputImages: number
  stages: ModelUsage[]
}

// ---------- 生成质量 ----------

export type QualityVerdictValue = 'identical' | 'related' | 'unrelated' | 'unknown'

export interface QualityVerdict {
  verdict: QualityVerdictValue
  reason: string
}

// ---------- 链路可观测性 ----------

export interface ModerationDebug {
  passed: boolean
  /** 审查服务不可用时是否跳过了审查（降级放行） */
  skipped?: boolean
  reason?: string
  raw?: string
}

export interface GenerationDebug {
  /** 视觉理解模型返回的原文（逐图） */
  rawDescriptions?: string[]
  /** 视觉理解的解析结果 */
  descriptions?: ImageDescription[]
  /** 脑洞模型返回的原文 */
  rawPromptOutput?: string
  /** 提示词守卫命中的阻断性问题（空数组代表通过） */
  promptIssues?: string[]
  /** 提示词守卫的提示性问题（不阻断，例如提示词含中文） */
  promptAdvisory?: string[]
  /** 是否使用了本地兜底提示词模板 */
  usedFallbackPrompt?: boolean
  /** 内容安全审查结论（含原因与原文） */
  moderation?: ModerationDebug
  /** 生成图与参考图的相关性判定 */
  quality?: QualityVerdict
  /** 图像生成实际尝试次数 */
  imageAttempts?: number
}

// ---------- 溯源记录 ----------

export interface ProvenanceRecord {
  id: string
  createdAt: string
  theme: string
  promptText?: string
  promptStyle?: string
  sourcePhotos: Array<{
    path: string
    filename: string
  }>
  generatedImagePath?: string
  savedImagePath?: string
  isDemoGeneration: boolean
  usage?: GenerationUsage
  debug?: GenerationDebug
}

// ---------- JobError 统一类型 ----------

export type JobError = {
  stage: JobState
  message: string
  code?: 'network' | 'timeout' | 'not_found' | 'content_rejected' | 'cancelled' | 'unknown'
}

// ---------- IPC API 接口 ----------

export type Unsubscribe = () => void

export interface ElectronAPI {
  photo: {
    selectDirectory(): Promise<string | null>
    addDirectory(path: string): Promise<DirectoryScanResult>
    removeDirectory(path: string): Promise<void>
    listDirectories(): Promise<DirectoryEntry[]>
    addExclusion(path: string, type: 'folder' | 'file'): Promise<void>
    removeExclusion(path: string): Promise<void>
    listExclusions(): Promise<ExclusionEntry[]>
  }

  job: {
    start(options: JobStartOptions): Promise<string>
    cancel(jobId: string): Promise<void>
    retry(): Promise<string>
    onStateChange(cb: (event: JobStateEvent) => void): Unsubscribe
  }

  config: {
    get(): Promise<AppConfig>
    set(partial: Partial<AppConfig>): Promise<void>
  }

  provenance: {
    save(record: ProvenanceRecord): Promise<void>
    list(): Promise<ProvenanceRecord[]>
    delete(id: string): Promise<void>
  }

  file: {
    saveGeneratedImage(dataUrl: string, suggestedName: string): Promise<string | null>
    saveToDirectory(dataUrl: string, suggestedName: string): Promise<string>
    selectSaveDirectory(): Promise<string | null>
    openImageViewer(path: string): Promise<void>
    readThumbnail(path: string): Promise<string>
  }

  env: {
    get(name: string): Promise<string | null>
  }

  widget: {
    getTriggerBounds(): Promise<WidgetBounds>
    getDropzoneBounds(): Promise<WidgetBounds>
    getDropzoneRect(): Promise<WidgetBounds>
    setVisible(visible: boolean): Promise<void>
    setAlwaysOnTop(onTop: boolean): Promise<void>
    onDropzoneRect(cb: (rect: WidgetBounds) => void): Unsubscribe
    onCrossWindowHover(cb: (hovering: boolean) => void): Unsubscribe
    onJobStateChange(cb: (event: JobStateEvent) => void): Unsubscribe
  }

  reveal: {
    getLatest(): Promise<{ imageDataUrl: string; provenance: ProvenanceRecord } | null>
    onResult(cb: (result: { imageDataUrl: string; provenance: ProvenanceRecord }) => void): Unsubscribe
  }
}
