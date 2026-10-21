import type { GeneratedPrompt, ModerationResult, ImageDescription } from './ModelGateway'
import type { ModelUsage, CreativityLevel } from '../../shared/types/api'

const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-v4-pro'

type DeepSeekResponse = {
  choices?: Array<{ message?: { content?: string | null } }>
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
}

/** 不同创作尺度下的采样温度：越保守越确定，越放飞越发散 */
const TEMPERATURE: Record<CreativityLevel, number> = {
  faithful: 0.6,
  balanced: 0.85,
  wild: 1.05
}

const SCALE_RULE: Record<CreativityLevel, string> = {
  faithful:
    '创作尺度【保守】：必须最大程度保留每张照片的主体、场景与相对关系，只允许做风格化、光线与氛围的提升；不得增删主体，不得替换主体的身份特征。',
  balanced:
    '创作尺度【平衡】：必须保留每张照片的核心主体与场景，可以自由改变艺术风格、光线、视角与组合方式；但不得凭空替换成描述之外的无关主体。',
  wild:
    '创作尺度【放飞】：可以进行大胆的超现实组合、风格重构与场景迁移；但最终画面仍必须让人能辨认出每张照片至少一个可识别的元素（主体或标志性场景）。'
}

function buildSystemPrompt(creativity: CreativityLevel): string {
  return [
    '你是一位专业的 AI 绘画提示词工程师。用户会给你 1~3 张照片的结构化描述（主体对象 / 环境背景 / 主要颜色 / 整体氛围 / 重要细节）。',
    '你的任务：把这些描述融合成一条高质量的英文图像生成提示词。',
    '',
    '硬性规则（必须全部遵守，违反任意一条即视为失败）：',
    '1. 必须直接使用描述中出现的主体对象、环境、颜色与细节，不得替换成描述里没有的主体或场景。',
    '2. 每张照片至少要有 1 个可识别元素（主体或标志性场景）出现在最终提示词中。',
    '3. text 字段只能使用英文，不得出现中文，不得出现方括号占位符（例如 [主体对象]），不得留下任何未填充的模板变量。',
    '4. text 必须具体描写画面：主体是什么、处于什么环境、主要颜色、光线氛围、艺术风格。',
    '5. 禁止色情、暴力、恐怖、仇恨或任何令人不适的内容。',
    '',
    SCALE_RULE[creativity],
    '',
    '只输出 JSON 对象，不要输出任何其他文字。格式示例：',
    '{"text":"A serene lakeside scene with a lone wooden boat, soft morning mist, warm golden light, cinematic photography","theme":"晨雾孤舟","style":"电影感写实摄影"}'
  ].join('\n')
}

function buildUserPrompt(descriptions: ImageDescription[], previousIssues?: string[]): string {
  const blocks = descriptions.map((d, i) => {
    return [
      `【照片${i + 1}】`,
      `主体对象：${d.subjects.length ? d.subjects.join('、') : '（未识别）'}`,
      `环境背景：${d.environment || '（未识别）'}`,
      `主要颜色：${d.colors.length ? d.colors.join('、') : '（未识别）'}`,
      `整体氛围：${d.mood || '（未识别）'}`,
      `重要细节：${d.details.length ? d.details.join('、') : '（未识别）'}`
    ].join('\n')
  })

  const parts = [
    '以下是本次参与创作的照片描述：',
    '',
    blocks.join('\n\n'),
    '',
    '请严格按系统规则，输出 JSON。'
  ]

  if (previousIssues && previousIssues.length > 0) {
    parts.push(
      '',
      `注意：你上一次的输出未通过校验，问题是：${previousIssues.join('；')}。`,
      '请针对上述问题修正后重新输出完整 JSON，不要重复同样的错误。'
    )
  }

  return parts.join('\n')
}

/**
 * 容错解析审查结论：模型可能返回 boolean / "true" / "yes" / 中文，甚至用别的字段名。
 * 返回 null 表示完全无法判定（此时按不通过处理并给出明确原因）。
 */
function normalizeBool(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase()
    if (['true', 'yes', 'y', 'pass', 'passed', 'safe', 'ok', 'allow', 'allowed', '通过', '安全', '合规', '无'].includes(v)) return true
    if (['false', 'no', 'n', 'fail', 'failed', 'unsafe', 'reject', 'rejected', 'blocked', '不通过', '不安全', '违规', '有'].includes(v)) return false
  }
  return null
}

function resolveVerdict(record: Record<string, unknown>): boolean | null {
  for (const key of ['passed', 'safe', 'ok', 'allowed', 'isSafe', '合规', '通过']) {
    const v = normalizeBool(record[key])
    if (v !== null) return v
  }
  for (const key of ['violation', 'unsafe', 'blocked', 'rejected', '违规']) {
    const v = normalizeBool(record[key])
    if (v !== null) return !v
  }
  return null
}

const MODERATOR_SYSTEM_PROMPT = [
  '你是一个内容安全审查员。请判断给定的图片生成提示词是否包含【明确】的下列内容：',
  '色情或性暗示、暴力伤害、恐怖主义、仇恨歧视、自残自杀、未成年人性化，以及其他明确令人不适的内容。',
  '',
  '判定原则（非常重要）：',
  '1. 只有当提示词【明确指向】上述内容时才判为不通过。',
  '2. 下列均属正常创作内容，必须判为通过：人物 / 肖像 / 自拍、动物、儿童日常场景、',
  '   黑暗或夜景、阴天或雾、奇幻 / 超现实 / 科幻 / 复古风格、戏剧性光影与史诗感构图。',
  '3. 不要因为出现风格词（cinematic、dark、dramatic、epic、fantasy、surreal、moody）',
  '   或出现人物、身体部位的中性描述就判为不通过。',
  '4. 拿不准时判为通过，不要过度审查。',
  '',
  '必须输出 JSON 对象：{"passed":true/false,"reason":"..."}。',
  '判为不通过时，reason 必须引用提示词中具体的问题片段；判为通过时 reason 写 "无"。'
].join('\n')

/**
 * DeepSeekAdapter — 使用 DeepSeek 的 OpenAI 兼容 Chat Completions API，
 * 负责脑洞提示词生成与内容安全审查。每个方法都返回 token 用量与原始输出。
 */
export class DeepSeekAdapter {
  constructor(private readonly apiKey: string) {}

  async createPrompt(
    descriptions: ImageDescription[],
    signal: AbortSignal,
    options: { creativity: CreativityLevel; previousIssues?: string[] }
  ): Promise<{ data: GeneratedPrompt; usage: ModelUsage; raw: string }> {
    const isRetry = Boolean(options.previousIssues && options.previousIssues.length > 0)
    const baseTemperature = TEMPERATURE[options.creativity]
    // 重试时降低温度，让它更"守规矩"而不是再次发散
    const temperature = isRetry ? Math.max(0.3, baseTemperature - 0.35) : baseTemperature

    const { data: result, usage, raw } = await this.requestJson<GeneratedPrompt>({
      max_tokens: 1024,
      temperature,
      messages: [
        { role: 'system', content: buildSystemPrompt(options.creativity) },
        { role: 'user', content: buildUserPrompt(descriptions, options.previousIssues) }
      ]
    }, signal)

    if (!result.text) throw new Error('DeepSeek returned an empty image prompt')
    return {
      data: {
        text: result.text,
        theme: result.theme || '记忆融合',
        style: result.style || '创意融合风格'
      },
      usage,
      raw
    }
  }

  async moderatePrompt(
    prompt: GeneratedPrompt,
    signal: AbortSignal
  ): Promise<{ data: ModerationResult; usage: ModelUsage; raw: string }> {
    const { data: result, usage, raw } = await this.requestJson<Record<string, unknown>>({
      max_tokens: 256,
      temperature: 0,
      messages: [
        { role: 'system', content: MODERATOR_SYSTEM_PROMPT },
        { role: 'user', content: `请审查以下图片生成提示词是否安全合规：\n\n${prompt.text}\n\n主题: ${prompt.theme}\n风格: ${prompt.style}` }
      ]
    }, signal)

    const verdict = resolveVerdict(result)
    const reason = typeof result['reason'] === 'string' ? result['reason'] : undefined

    if (verdict === null) {
      // 完全无法判定时才按不通过处理，并如实说明是"无法解析"而不是内容问题
      return {
        data: { passed: false, reason: `审查结论无法解析（原文：${raw.slice(0, 200)}）` },
        usage,
        raw
      }
    }

    return { data: { passed: verdict, reason }, usage, raw }
  }

  private async requestJson<T>(
    request: {
      max_tokens: number
      temperature?: number
      messages: Array<{ role: 'system' | 'user'; content: string }>
    },
    signal: AbortSignal
  ): Promise<{ data: T; usage: ModelUsage; raw: string }> {
    const resp = await fetch(DEEPSEEK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        ...request,
        thinking: { type: 'disabled' },
        response_format: { type: 'json_object' }
      }),
      signal
    })

    if (!resp.ok) {
      const errText = await resp.text()
      throw new Error(`DeepSeek API error: ${resp.status} ${errText}`)
    }

    const data = await resp.json() as DeepSeekResponse
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('DeepSeek API returned no message content')

    let parsed: T
    try {
      parsed = JSON.parse(content) as T
    } catch {
      throw new Error('DeepSeek API returned invalid JSON')
    }

    const u = data.usage ?? {}
    const usage: ModelUsage = {
      model: DEEPSEEK_MODEL,
      inputTokens: u.prompt_tokens ?? 0,
      outputTokens: u.completion_tokens ?? 0,
      totalTokens: u.total_tokens ?? 0,
      imageTokens: 0,
      inputImages: 0,
      outputImages: 0
    }

    return { data: parsed, usage, raw: content }
  }
}
