// ModelGateway 接口定义
// 两种实现：MockModelGateway（Demo 模式）和 RealModelGateway（真实 API 模式）

import type {
  ModelUsage,
  ImageDescription,
  CreativityLevel,
  QualityVerdict
} from '../../shared/types/api'

export type { ImageDescription }

export interface GeneratedPrompt {
  text: string
  theme: string
  style: string
}

export interface ModerationResult {
  passed: boolean
  reason?: string
}

export interface GeneratedImage {
  dataUrl: string
  width: number
  height: number
}

/** 统一的模型返回包装：数据 + 用量 + 原始输出（原始输出用于排障） */
export interface ModelResult<T> {
  data: T
  usage: ModelUsage
  raw?: string
}

/** 图像生成调用选项 */
export interface GatewayOptions {
  creativity: CreativityLevel
}

/** 脑洞提示词调用选项（previousIssues 用于把上一次的失败原因回传给模型做纠正） */
export interface PromptOptions extends GatewayOptions {
  previousIssues?: string[]
}

export interface ModelGateway {
  describeImages(imagePaths: string[], signal: AbortSignal): Promise<ModelResult<ImageDescription[]>>
  createPrompt(
    descriptions: ImageDescription[],
    signal: AbortSignal,
    options: PromptOptions
  ): Promise<ModelResult<GeneratedPrompt>>
  moderatePrompt(prompt: GeneratedPrompt, signal: AbortSignal): Promise<ModelResult<ModerationResult>>
  generateImage(
    prompt: GeneratedPrompt,
    referenceImagePath: string,
    signal: AbortSignal,
    options: GatewayOptions
  ): Promise<ModelResult<GeneratedImage>>
  /** 生成后自检：判断生成图与参考图的关系（identical / related / unrelated） */
  verifyRelevance(
    generatedImageDataUrl: string,
    referenceImagePaths: string[],
    signal: AbortSignal
  ): Promise<QualityVerdict>
}
