import type { GeneratedPrompt } from '../gateway/ModelGateway'
import type { ImageDescription } from '../../shared/types/api'

/**
 * 明确属于「未填充模板」的形态：
 * - 方括号/花括号内含中文（如 [主体对象]）
 * - 方括号内是字段英文名（如 [subject]）
 * - `{{变量}}`
 * 只匹配这些明确形态，避免误伤正常提示词里的方括号。
 */
const PLACEHOLDER_RES: RegExp[] = [
  /\[[^\]]*[\u4e00-\u9fff][^\]]*\]/,
  /\{[^}]*[\u4e00-\u9fff][^}]*\}/,
  /\[\s*(subject|subjects|environment|background|color|colors|mood|atmosphere|details?|style|scene|object|placeholder)\s*\]/i,
  /\{\{\s*[^{}]{1,30}\s*\}\}/
]

const CJK_RE = /[\u4e00-\u9fff]/
const MIN_TEXT_LENGTH = 20

export interface PromptCheck {
  /** 阻断性问题：命中则不允许送进图像模型 */
  blocking: string[]
  /** 提示性问题：仅记录，不阻断（Qwen-Image 本身支持中文提示词） */
  advisory: string[]
}

/**
 * 提示词守卫：只拦截「结构性坏掉」的提示词（空 / 占位符）。
 * 中文属于可接受情况（Qwen 系图像模型支持中文提示词），因此只做记录不阻断。
 *
 * 之所以只拦结构问题：历史上「双景创意融合」那次事故的根因是
 * 解析失败导致占位符 `[主体对象]` 被原样送进图像模型，而不是语言问题。
 */
export function checkPrompt(prompt: GeneratedPrompt): PromptCheck {
  const blocking: string[] = []
  const advisory: string[] = []
  const text = (prompt.text || '').trim()

  if (text.length < MIN_TEXT_LENGTH) {
    blocking.push('提示词内容过短或为空')
  }
  if (PLACEHOLDER_RES.some((re) => re.test(text))) {
    blocking.push('提示词含未填充的占位符（如 [主体对象]）')
  }

  if (CJK_RE.test(text)) {
    advisory.push('提示词含中文（已放行，Qwen-Image 支持中文）')
  }
  if (!prompt.theme || !prompt.theme.trim()) {
    advisory.push('缺少主题名 theme')
  }

  return { blocking, advisory }
}

/**
 * 兜底提示词：当脑洞模型连续产出不合格内容时使用，
 * 由本地按结构化描述拼装，保证流水线不会因为提示词环节而中断。
 */
export function buildFallbackPrompt(descriptions: ImageDescription[]): GeneratedPrompt {
  const subjects = descriptions.flatMap((d) => d.subjects).filter(Boolean)
  const environments = descriptions.map((d) => d.environment).filter(Boolean)
  const colors = descriptions.flatMap((d) => d.colors).filter(Boolean)
  const moods = descriptions.map((d) => d.mood).filter(Boolean)
  const details = descriptions.flatMap((d) => d.details).filter(Boolean)

  const segments = [
    subjects.length ? subjects.join('、') : '',
    environments.length ? `置于${environments.join('；')}` : '',
    colors.length ? `主色调为${colors.join('、')}` : '',
    moods.length ? `整体氛围${moods.join('、')}` : '',
    details.length ? `细节包括${details.join('、')}` : '',
    '高质量，细节丰富，构图完整'
  ].filter(Boolean)

  const text = segments.join('，')

  return {
    text: text.length >= MIN_TEXT_LENGTH
      ? text
      : '一幅融合了用户记忆片段的画面，主体清晰，光影自然，高质量，细节丰富',
    theme: '记忆融合',
    style: '写实融合风格'
  }
}
