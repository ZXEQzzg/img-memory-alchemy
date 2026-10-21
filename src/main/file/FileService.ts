import { dialog, shell, BrowserWindow, app } from 'electron'
import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync } from 'fs'
import { join } from 'path'

/** 未配置保存目录时的默认子目录名 */
const DEFAULT_SAVE_SUBDIR = '记忆炼金'

function decodeDataUrl(dataUrl: string): { buffer: Buffer; mime: string; extension: string } {
  const match = dataUrl.match(/^data:(image\/[\w.+-]+);base64,(.+)$/)
  if (!match) throw new Error('Invalid dataUrl format')
  const mime = match[1]
  const extension = mime === 'image/svg+xml' ? '.svg' : mime === 'image/jpeg' ? '.jpg' : `.${mime.split('/')[1] || 'png'}`
  return { buffer: Buffer.from(match[2], 'base64'), mime, extension }
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[\\/:*?"<>|\r\n]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'image'
}

function stripExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

/**
 * FileService — 文件保存与读取服务。
 * 保存分两层：内部缓存（展示用，userData/generated）与用户保存（saveToDirectory / saveImageFile）。
 */
export class FileService {
  /**
   * 另存为：调用系统保存对话框，把图片保存到用户临时选择的位置。
   * @returns 保存路径，取消返回 null
   */
  async saveImageFile(dataUrl: string, suggestedName: string): Promise<string | null> {
    const win = BrowserWindow.getAllWindows()[0]

    const result = await dialog.showSaveDialog(win ?? new (await import('electron')).BrowserWindow(), {
      defaultPath: join(app.getPath('pictures'), sanitizeFilename(suggestedName)),
      filters: [
        { name: 'PNG Image', extensions: ['png'] },
        { name: 'JPEG Image', extensions: ['jpg', 'jpeg'] },
        { name: 'SVG Image', extensions: ['svg'] }
      ],
      message: '保存生成的图片'
    })

    if (result.canceled || !result.filePath) return null

    const decoded = decodeDataUrl(dataUrl)
    let filePath = result.filePath

    if (!filePath.toLowerCase().endsWith(decoded.extension)) {
      filePath = filePath.replace(/\.[^\\/.]+$/, '') + decoded.extension
    }

    // 安全校验：不覆盖原始照片（源图目录检查）
    if (this.isInSourceDirectory(filePath)) {
      throw new Error('不能将生成图片保存到原始照片目录中')
    }

    writeFileSync(filePath, decoded.buffer)
    return filePath
  }

  /**
   * 一键保存：保存到「默认保存目录」（控制页可配置），不弹窗；重名自动加序号。
   * @returns 实际保存的完整路径
   */
  async saveToDirectory(dataUrl: string, suggestedName: string): Promise<string> {
    const decoded = decodeDataUrl(dataUrl)
    const dir = this.getSaveDirectory()
    mkdirSync(dir, { recursive: true })

    const base = sanitizeFilename(stripExtension(suggestedName) || 'memory-alchemy')
    let filePath = join(dir, `${base}${decoded.extension}`)
    let n = 2
    while (existsSync(filePath)) {
      filePath = join(dir, `${base} (${n})${decoded.extension}`)
      n += 1
    }

    writeFileSync(filePath, decoded.buffer)
    return filePath
  }

  /**
   * 删除内部缓存图（仅允许删除 userData/generated 下的文件，绝不误删用户保存的成品）
   */
  deleteGeneratedImage(path: string | undefined): void {
    if (!path) return
    try {
      const generatedRoot = join(app.getPath('userData'), 'generated')
      const normalize = (p: string): string => p.replace(/\\/g, '/')
      if (normalize(path).startsWith(normalize(generatedRoot)) && existsSync(path)) {
        unlinkSync(path)
      }
    } catch (err) {
      console.warn('[FileService] deleteGeneratedImage failed:', err)
    }
  }

  /**
   * 读取图片文件为 base64 dataUrl
   */
  async readImageAsDataUrl(path: string): Promise<string> {
    if (!existsSync(path)) {
      throw new Error(`File not found: ${path}`)
    }
    const buffer = readFileSync(path)
    const ext = path.split('.').pop()?.toLowerCase()
    const mime = this.getMimeType(ext || 'png')
    return `data:${mime};base64,${buffer.toString('base64')}`
  }

  /**
   * 用系统默认程序打开图片
   */
  async openImageViewer(path: string): Promise<void> {
    shell.openPath(path)
  }

  private getSaveDirectory(): string {
    try {
      const store = (app as unknown as Record<string, unknown>)._imgAlchemyConfigStore
      const config = (store as import('../store/ConfigStore').ConfigStore).getConfig()
      const dir = config.saveDirectory
      if (dir && dir.trim()) return dir.trim()
    } catch {
      // 忽略，走默认
    }
    return join(app.getPath('pictures'), DEFAULT_SAVE_SUBDIR)
  }

  /**
   * 检查路径是否在源图目录中（防止覆盖原始照片）
   */
  private isInSourceDirectory(targetPath: string): boolean {
    try {
      const store = (app as unknown as Record<string, unknown>)._imgAlchemyConfigStore
      if (!store) return false
      const config = (store as import('../store/ConfigStore').ConfigStore).getConfig()
      const dirs = config.directories as string[]
      const normalize = (p: string): string => p.replace(/\\/g, '/')
      const nTarget = normalize(targetPath)
      for (const dir of dirs) {
        const nDir = normalize(dir)
        if (nTarget.startsWith(nDir)) return true
      }
      return false
    } catch {
      return false
    }
  }

  private getMimeType(ext: string): string {
    const map: Record<string, string> = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml'
    }
    return map[ext] || 'image/png'
  }
}
