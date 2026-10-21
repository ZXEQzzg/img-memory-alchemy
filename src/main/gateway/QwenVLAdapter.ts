import type { ImageDescription } from './ModelGateway'
import type { JobError, ModelUsage, QualityVerdict } from '../../shared/types/api'

const QWEN_VL_ENDPOINT = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'
const QWEN_VL_MODEL = 'qwen3-vl-plus'

/** 严格 JSON 输出指令：结构固定、必须包含人物、必须具体 */
const DESCRIBE_INSTRUCTION = [
  '请仔细观察这张照片，只输出一个 JSON 对象，不要输出任何解释文字或代码块标记。',
  'JSON 结构：',
  '{"subjects":["画面中最主要的主体，1-3 个具体名词"],"environment":"场景与环境描述","colors":["主要颜色，2-4 个"],"mood":"整体氛围","details":["值得注意的具体细节，2-5 个"]}',
  '要求：',
  '1. 所有字段都必须填写，使用中文；',
  '2. 必须具体（例如写「白底黑字的招牌」，不要只写「文字」）；',
  '3. 如果画面中出现人物（包括自拍者、路人、合影者），必须把人物写入 subjects，不要忽略人。'
].join('\n')

function mimeOf(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || 'png'
  return `image/${ext === 'jpg' ? 'jpeg' : ext}`
}

/**
 * QwenVLAdapter — 调用 Qwen3-VL-Plus 实现图片描述与生成结果相关性校验。
 * 描述优先走严格 JSON 解析，失败时回退到文本解析，避免因格式漂移而丢信息。
 */
export class QwenVLAdapter {
  private readonly apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async describeImages(
    imagePaths: string[],
    signal: AbortSignal
  ): Promise<{ data: ImageDescription[]; usage: ModelUsage; raw: string }> {
    const { readFileSync } = await import('fs')

    const results: ImageDescription[] = []
    const rawTexts: string[] = []
    const usage: ModelUsage = {
      model: QWEN_VL_MODEL,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      imageTokens: 0,
      inputImages: imagePaths.length,
      outputImages: 0
    }

    for (const imagePath of imagePaths) {
      if (signal.aborted) throw this.mapError(new Error('Aborted'))

      const base64 = readFileSync(imagePath).toString('base64')

      const resp = await fetch(QWEN_VL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: QWEN_VL_MODEL,
          input: {
            messages: [
              {
                role: 'user',
                content: [
                  { image: `data:${mimeOf(imagePath)};base64,${base64}` },
                  { text: DESCRIBE_INSTRUCTION }
                ]
              }
            ]
          },
          parameters: { max_tokens: 800 }
        }),
        signal
      })

      if (!resp.ok) {
        throw this.mapError(new Error(`QwenVL API error: ${resp.status} ${resp.statusText}`))
      }

      const data = await resp.json()
      const text = data?.output?.choices?.[0]?.message?.content?.[0]?.text || ''

      const u = data?.usage ?? {}
      usage.inputTokens += u.input_tokens ?? 0
      usage.outputTokens += u.output_tokens ?? 0
      usage.totalTokens += u.total_tokens ?? 0
      usage.imageTokens += u.image_tokens ?? 0

      rawTexts.push(text)
      results.push(this.parseDescription(text))
    }

    return { data: results, usage, raw: rawTexts.join('\n\n----------\n\n') }
  }

  /**
   * 生成后自检：把参考图与生成图一起交给视觉模型判断相关性。
   * 任何异常都返回 unknown，绝不影响主流程。
   */
  async verifyRelevance(
    generatedImageDataUrl: string,
    referenceImagePaths: string[],
    signal: AbortSignal
  ): Promise<QualityVerdict> {
    try {
      const { readFileSync, existsSync } = await import('fs')
      const refs = referenceImagePaths.slice(0, 2)

      const content: Array<{ image?: string; text?: string }> = []
      let refCount = 0
      for (const p of refs) {
        if (!existsSync(p)) continue
        content.push({ image: `data:${mimeOf(p)};base64,${readFileSync(p).toString('base64')}` })
        refCount += 1
      }
      if (refCount === 0) return { verdict: 'unknown', reason: '参考图不可读，跳过校验' }

      content.push({ image: generatedImageDataUrl })
      content.push({
        text: [
          `前 ${refCount} 张是用户的原始照片素材，最后一张是 AI 生成的作品。`,
          '请判断「生成作品」与「原始素材」的关系，只输出 JSON：{"verdict":"identical|related|unrelated","reason":"简短中文说明"}。',
          'identical＝几乎就是原图的复制或仅轻微改动；',
          'related＝能明显看出保留了原素材中至少一个可识别的主体或场景；',
          'unrelated＝几乎看不出与原素材的关联。'
        ].join('\n')
      })

      const resp = await fetch(QWEN_VL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: QWEN_VL_MODEL,
          input: { messages: [{ role: 'user', content }] },
          parameters: { max_tokens: 300 }
        }),
        signal
      })

      if (!resp.ok) return { verdict: 'unknown', reason: `校验请求失败：${resp.status}` }

      const data = await resp.json()
      const text: string = data?.output?.choices?.[0]?.message?.content?.[0]?.text || ''
      return this.parseVerdict(text)
    } catch (err) {
      return { verdict: 'unknown', reason: err instanceof Error ? err.message : '校验异常' }
    }
  }

  private parseVerdict(text: string): QualityVerdict {
    const json = this.extractJson(text)
    const rawVerdict = json ? String(json['verdict'] ?? '') : ''
    const reason = json ? String(json['reason'] ?? '') : ''
    const normalized = rawVerdict.trim().toLowerCase()

    if (normalized === 'identical' || normalized === 'related' || normalized === 'unrelated') {
      return { verdict: normalized, reason: reason || '模型判定' }
    }

    // JSON 解析失败时，退化为关键词判断
    if (text.includes('identical')) return { verdict: 'identical', reason: reason || '关键词判定' }
    if (text.includes('unrelated')) return { verdict: 'unrelated', reason: reason || '关键词判定' }
    if (text.includes('related')) return { verdict: 'related', reason: reason || '关键词判定' }
    return { verdict: 'unknown', reason: reason || '无法解析校验结果' }
  }

  /** 从自由文本中提取第一个完整的 JSON 对象 */
  private extractJson(text: string): Record<string, unknown> | null {
    const start = text.indexOf('{')
    if (start < 0) return null
    let depth = 0
    for (let i = start; i < text.length; i++) {
      const ch = text[i]
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) {
          try {
            return JSON.parse(text.slice(start, i + 1)) as Record<string, unknown>
          } catch {
            return null
          }
        }
      }
    }
    return null
  }

  private toArray(value: unknown): string[] {
    if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean)
    if (typeof value === 'string') return value.split(/[，、,;；]/).map((s) => s.trim()).filter(Boolean)
    return []
  }

  private toText(value: unknown): string {
    if (typeof value === 'string') return value.trim()
    if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean).join('、')
    return ''
  }

  private parseDescription(text: string): ImageDescription {
    // 1) 优先严格 JSON
    const json = this.extractJson(text)
    if (json) {
      const parsed = this.fromJson(json)
      if (parsed) return parsed
    }
    // 2) 回退到文本解析（含兜底，保证信息不整体丢失）
    return this.fromText(text)
  }

  private fromJson(record: Record<string, unknown>): ImageDescription | null {
    const subjects = this.toArray(record['subjects'] ?? record['主体'] ?? record['主体对象'])
    const environment = this.toText(record['environment'] ?? record['环境'] ?? record['环境背景'])
    const colors = this.toArray(record['colors'] ?? record['颜色'] ?? record['主要颜色'])
    const mood = this.toText(record['mood'] ?? record['氛围'] ?? record['整体氛围'])
    const details = this.toArray(record['details'] ?? record['细节'] ?? record['重要细节'])

    const empty = subjects.length === 0 && !environment && colors.length === 0 && !mood && details.length === 0
    if (empty) return null
    return { subjects, environment, colors, mood, details }
  }

  private fromText(text: string): ImageDescription {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

    const pick = (keys: string[]): string => {
      for (const line of lines) {
        for (const key of keys) {
          const re = new RegExp(`^[\\s\\d.、)）-]*(?:${key})[^:：]*[:：]\\s*(.+)$`)
          const m = line.match(re)
          if (m && m[1].trim()) return m[1].trim()
        }
      }
      return ''
    }
    const split = (s: string): string[] => s.split(/[，、,;；]/).map((x) => x.trim()).filter(Boolean)

    const subjects = split(pick(['主体对象', '主体']))
    const environment = pick(['环境背景', '环境', '背景'])
    const colors = split(pick(['主要颜色', '颜色', '色彩']))
    const mood = pick(['整体氛围', '氛围', '感觉'])
    const details = split(pick(['重要细节', '细节', '其他']))

    const empty = subjects.length === 0 && !environment && colors.length === 0 && !mood && details.length === 0
    if (empty) {
      // 兜底：完全解析失败时，把整段原文当作环境描述，避免信息整体丢失
      return {
        subjects: [],
        environment: text.replace(/\s+/g, ' ').trim(),
        colors: [],
        mood: '',
        details: []
      }
    }
    return { subjects, environment, colors, mood, details }
  }

  private mapError(err: Error): JobError {
    if (err.name === 'AbortError' || err.message.includes('abort')) {
      return { stage: 'describing', message: '操作已取消', code: 'cancelled' }
    }
    if (err.message.includes('timeout')) {
      return { stage: 'describing', message: '请求超时', code: 'timeout' }
    }
    return { stage: 'describing', message: err.message, code: 'network' }
  }
}
