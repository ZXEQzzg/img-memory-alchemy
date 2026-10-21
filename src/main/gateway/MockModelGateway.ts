import { join } from 'path'
import { existsSync, readFileSync } from 'fs'
import type {
  ModelGateway,
  ImageDescription,
  GeneratedPrompt,
  ModerationResult,
  GeneratedImage
} from './ModelGateway'
import type { ModelUsage, CreativityLevel, QualityVerdict } from '../../shared/types/api'

// 确定性预置数据（MockModelGateway 不发起任何网络请求）
const MOCK_DESCRIPTIONS: ImageDescription[] = [
  {
    subjects: ['一只橘猫', '旧皮革沙发'],
    environment: '午后阳光照射的客厅',
    colors: ['暖橙', '米白', '棕褐'],
    mood: '慵懒温暖',
    details: ['阳光斑点', '沙发纹理', '毛发细节']
  },
  {
    subjects: ['满天繁星', '远山剪影'],
    environment: '郊外旷野的深夜',
    colors: ['深蓝', '银白', '墨黑'],
    mood: '静谧辽阔',
    details: ['银河弧线', '山脊曲线', '星光闪烁']
  }
]

const MOCK_PROMPT: GeneratedPrompt = {
  text: 'An impossible fusion where a lazy ginger cat lounges on a cosmic sofa drifting through a star-filled galaxy, warm tangerine fur against cool silver starlight, dreamlike and whimsical, Studio Ghibli aesthetic',
  theme: '星际慵猫 — 记忆与宇宙的温柔碰撞',
  style: 'Studio Ghibli 风格，梦幻水彩'
}

const MOCK_MODERATION: ModerationResult = { passed: true }

const MOCK_MODEL = 'mock'

function emptyUsage(partial: Partial<ModelUsage> = {}): ModelUsage {
  return {
    model: MOCK_MODEL,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    imageTokens: 0,
    inputImages: 0,
    outputImages: 0,
    ...partial
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function abortCheck(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }
}

/**
 * MockModelGateway — Demo 模式实现，所有方法返回本地预置数据，
 * 不发起任何网络请求。用量为 0（仅记录输入/输出图片数用于展示）。
 */
export class MockModelGateway implements ModelGateway {
  private readonly demoImagePath: string

  constructor(resourcesPath?: string) {
    if (resourcesPath) {
      this.demoImagePath = join(resourcesPath, 'demo', 'generated.svg')
    } else {
      this.demoImagePath = join(__dirname, '../../assets/demo/generated.svg')
    }
  }

  async describeImages(
    imagePaths: string[],
    signal: AbortSignal
  ): Promise<{ data: ImageDescription[]; usage: ModelUsage; raw: string }> {
    await delay(800)
    abortCheck(signal)
    const data = MOCK_DESCRIPTIONS.slice(0, Math.max(1, imagePaths.length))
    return {
      data,
      usage: emptyUsage({ inputImages: imagePaths.length }),
      raw: JSON.stringify(data, null, 2)
    }
  }

  async createPrompt(
    descriptions: ImageDescription[],
    signal: AbortSignal,
    options: { creativity: CreativityLevel; previousIssues?: string[] }
  ): Promise<{ data: GeneratedPrompt; usage: ModelUsage; raw: string }> {
    await delay(600)
    abortCheck(signal)
    void descriptions
    return {
      data: { ...MOCK_PROMPT },
      usage: emptyUsage(),
      raw: JSON.stringify({ ...MOCK_PROMPT, mockCreativity: options.creativity })
    }
  }

  async moderatePrompt(
    prompt: GeneratedPrompt,
    signal: AbortSignal
  ): Promise<{ data: ModerationResult; usage: ModelUsage; raw: string }> {
    await delay(300)
    abortCheck(signal)
    void prompt
    return { data: { ...MOCK_MODERATION }, usage: emptyUsage(), raw: JSON.stringify(MOCK_MODERATION) }
  }

  async generateImage(
    prompt: GeneratedPrompt,
    referenceImagePath: string,
    signal: AbortSignal,
    options: { creativity: CreativityLevel }
  ): Promise<{ data: GeneratedImage; usage: ModelUsage; raw: string }> {
    await delay(1200)
    abortCheck(signal)
    void prompt
    void referenceImagePath

    let data: GeneratedImage

    if (existsSync(this.demoImagePath)) {
      const buffer = readFileSync(this.demoImagePath)
      data = {
        dataUrl: `data:image/svg+xml;base64,${buffer.toString('base64')}`,
        width: 512,
        height: 512
      }
    } else {
      const svgPlaceholder =
        '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">' +
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#1e2a4a"/><stop offset="1" stop-color="#4a2a4a"/>' +
        '</linearGradient></defs>' +
        '<rect width="512" height="512" fill="url(#g)"/>' +
        '<text x="256" y="246" text-anchor="middle" fill="#e8d5ff" font-size="36" font-family="sans-serif">✨</text>' +
        '<text x="256" y="290" text-anchor="middle" fill="#c0cce8" font-size="22" font-family="sans-serif">Demo 生成</text>' +
        '</svg>'
      data = {
        dataUrl: `data:image/svg+xml;base64,${Buffer.from(svgPlaceholder).toString('base64')}`,
        width: 512,
        height: 512
      }
    }

    return {
      data,
      usage: emptyUsage({ outputImages: 1 }),
      raw: JSON.stringify({ mockCreativity: options.creativity })
    }
  }

  async verifyRelevance(): Promise<QualityVerdict> {
    return { verdict: 'unknown', reason: 'Demo 模式不做相关性校验' }
  }
}
