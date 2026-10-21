import { MockModelGateway } from './MockModelGateway'
import { QwenVLAdapter } from './QwenVLAdapter'
import { DeepSeekAdapter } from './DeepSeekAdapter'
import { QwenImageAdapter } from './QwenImageAdapter'
import type { ModelGateway, ImageDescription, GeneratedPrompt, ModerationResult, GeneratedImage } from './ModelGateway'
import type { ModelUsage, CreativityLevel, QualityVerdict } from '../../shared/types/api'

type WithUsage<T> = { data: T; usage: ModelUsage; raw: string }

/**
 * RealModelGateway — 使用真实 API adapter 组合实现 ModelGateway
 */
class RealModelGateway implements ModelGateway {
  private readonly qwenVL: QwenVLAdapter
  private readonly deepSeek: DeepSeekAdapter
  private readonly qwenImage: QwenImageAdapter

  constructor(qwenApiKey: string, deepSeekApiKey: string) {
    this.qwenVL = new QwenVLAdapter(qwenApiKey)
    this.deepSeek = new DeepSeekAdapter(deepSeekApiKey)
    this.qwenImage = new QwenImageAdapter(qwenApiKey)
  }

  describeImages(imagePaths: string[], signal: AbortSignal): Promise<WithUsage<ImageDescription[]>> {
    return this.qwenVL.describeImages(imagePaths, signal)
  }

  createPrompt(
    descriptions: ImageDescription[],
    signal: AbortSignal,
    options: { creativity: CreativityLevel; previousIssues?: string[] }
  ): Promise<WithUsage<GeneratedPrompt>> {
    return this.deepSeek.createPrompt(descriptions, signal, options)
  }

  moderatePrompt(prompt: GeneratedPrompt, signal: AbortSignal): Promise<WithUsage<ModerationResult>> {
    return this.deepSeek.moderatePrompt(prompt, signal)
  }

  generateImage(
    prompt: GeneratedPrompt,
    referenceImagePath: string,
    signal: AbortSignal,
    options: { creativity: CreativityLevel }
  ): Promise<WithUsage<GeneratedImage>> {
    return this.qwenImage.generateImage(prompt, referenceImagePath, signal, options)
  }

  verifyRelevance(
    generatedImageDataUrl: string,
    referenceImagePaths: string[],
    signal: AbortSignal
  ): Promise<QualityVerdict> {
    return this.qwenVL.verifyRelevance(generatedImageDataUrl, referenceImagePaths, signal)
  }
}

/**
 * createModelGateway — 根据模式返回对应的 ModelGateway 实现
 */
export function createModelGateway(mode: 'demo' | 'real', resourcesPath?: string): ModelGateway {
  if (mode === 'real') {
    const qwenApiKey = process.env['QWEN_API_KEY'] || ''
    const deepSeekApiKey = process.env['DEEPSEEK_API_KEY'] || ''

    if (!qwenApiKey || !deepSeekApiKey) {
      console.warn('[createModelGateway] Missing API keys, falling back to mock')
      return new MockModelGateway(resourcesPath)
    }

    return new RealModelGateway(qwenApiKey, deepSeekApiKey)
  }

  return new MockModelGateway(resourcesPath)
}
