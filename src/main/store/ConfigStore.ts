import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { app } from 'electron'
import type { AppConfig } from '../../shared/types/api'

// 默认配置
export const DEFAULT_CONFIG: AppConfig = {
  mode: 'demo',
  skin: 'pixel',
  referenceCount: 1,
  creativity: 'balanced',
  qualityGuard: true,
  widgetVisible: true,
  widgetAlwaysOnTop: false,
  saveDirectory: '',
  directories: [],
  exclusions: [],
  triggerBounds: { x: 200, y: 300, width: 80, height: 80 },
  dropzoneBounds: { x: 400, y: 300, width: 120, height: 120 },
  dropzoneScale: 1
}

/**
 * ConfigStore - AppConfig 持久化存储。
 * 将配置写入用户数据目录下的 config.json 文件。
 * 构造函数接受可选的 filePath 参数，用于单元测试传入临时目录。
 * 生产环境中应在 app.whenReady() 之后调用，以确保 app.getPath('userData') 可用。
 */
export class ConfigStore {
  private config: AppConfig
  private filePath: string

  constructor(filePath?: string) {
    this.filePath = filePath ?? join(app.getPath('userData'), 'config.json')
    this.config = this.load()
  }

  private load(): AppConfig {
    try {
      if (!existsSync(this.filePath)) {
        return { ...DEFAULT_CONFIG }
      }
      const raw = readFileSync(this.filePath, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<AppConfig>
      return { ...DEFAULT_CONFIG, ...parsed }
    } catch {
      return { ...DEFAULT_CONFIG }
    }
  }

  private save(): void {
    try {
      const dir = dirname(this.filePath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      writeFileSync(this.filePath, JSON.stringify(this.config, null, 2), 'utf-8')
    } catch (err) {
      console.error('[ConfigStore] Failed to save config:', err)
    }
  }

  getConfig(): AppConfig {
    return { ...this.config }
  }

  setConfig(partial: Partial<AppConfig>): void {
    this.config = { ...this.config, ...partial }
    this.save()
  }
}
