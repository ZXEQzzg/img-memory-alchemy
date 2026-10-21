import type { GeneratedPrompt, GeneratedImage } from './ModelGateway'
import type { ModelUsage, CreativityLevel } from '../../shared/types/api'

const QWEN_IMAGE_ENDPOINT = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'
const QWEN_IMAGE_MODEL = 'qwen-image-2.0-pro'

function mimeOf(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || 'png'
  return `image/${ext === 'jpg' ? 'jpeg' : ext}`
}

/**
 * QwenImageAdapter — 调用 Qwen-Image 实现图片生成。
 *
 * prompt_extend 说明：开启时服务端会自行扩写提示词，会削弱我们「锚定原图主体」的约束。
 * 因此仅在「放飞」档位开启，其余档位关闭，把控制权留在我们自己的提示词里。
 */
export class QwenImageAdapter {
  private readonly apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async generateImage(
    prompt: GeneratedPrompt,
    referenceImagePath: string,
    signal: AbortSignal,
    options: { creativity: CreativityLevel }
  ): Promise<{ data: GeneratedImage; usage: ModelUsage; raw: string }> {
    const content: Array<{ image?: string; text?: string }> = []
    let hasReference = false

    if (referenceImagePath) {
      const { readFileSync, existsSync } = await import('fs')
      if (existsSync(referenceImagePath)) {
        content.push({
          image: `data:${mimeOf(referenceImagePath)};base64,${readFileSync(referenceImagePath).toString('base64')}`
        })
        hasReference = true
      }
    }

    content.push({ text: prompt.text })

    const resp = await fetch(QWEN_IMAGE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: QWEN_IMAGE_MODEL,
        input: { messages: [{ role: 'user', content }] },
        parameters: {
          n: 1,
          prompt_extend: options.creativity === 'wild',
          watermark: false,
          size: '1024*1024'
        }
      }),
      signal
    })

    if (!resp.ok) {
      const errText = await resp.text()
      throw new Error(`QwenImage API error: ${resp.status} ${errText}`)
    }

    const data = await resp.json()
    const imageUrl = data?.output?.choices?.[0]?.message?.content?.[0]?.image
    if (!imageUrl) {
      throw new Error('QwenImage API returned no image URL')
    }

    const imageResp = await fetch(imageUrl, { signal })
    if (!imageResp.ok) {
      throw new Error(`Failed to download generated image: ${imageResp.status}`)
    }

    const contentType = imageResp.headers.get('content-type') || 'image/png'
    const buffer = Buffer.from(await imageResp.arrayBuffer())
    const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`

    const u = data?.usage ?? {}
    const usage: ModelUsage = {
      model: QWEN_IMAGE_MODEL,
      inputTokens: u.input_tokens ?? 0,
      outputTokens: u.output_tokens ?? 0,
      totalTokens: u.total_tokens ?? 0,
      imageTokens: u.image_tokens ?? 0,
      // 参考图是「已抽中照片」的重发（photos[0] 已在 describeImages 计过），
      // 不重复计入输入图片数，避免"2 张显示 3 张、3 张显示 4 张"。
      inputImages: 0,
      outputImages: 1
    }

    return {
      data: { dataUrl, width: 1024, height: 1024 },
      usage,
      raw: JSON.stringify({
        promptExtend: options.creativity === 'wild',
        size: '1024*1024',
        referenceImage: hasReference
      })
    }
  }
}
