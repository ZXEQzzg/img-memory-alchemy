import { ipcMain, dialog, BrowserWindow } from 'electron'
import { normalize, resolve } from 'path'
import type { ConfigStore } from '../store/ConfigStore'
import type { PhotoRepository } from '../photo/PhotoRepository'
import type { AppConfig, JobStartOptions } from '../../shared/types/api'
import type { GenerationJobService } from '../job/GenerationJobService'
import type { ProvenanceStore } from '../store/ProvenanceStore'
import type { FileService } from '../file/FileService'

// ---------------------------------------------------------------------------
// 路径合法性验证
// ---------------------------------------------------------------------------
function isAbsolutePath(p: string): boolean {
  return p === normalize(p) && resolve(p) === p
}

/**
 * 注册所有 IPC Handler
 */
export function registerIpcHandlers(deps: {
  configStore: ConfigStore
  photoRepository: PhotoRepository
  jobService: GenerationJobService
  provenanceStore: ProvenanceStore
  fileService: FileService
  getControlWindow: () => BrowserWindow | null
  getWidgetWindow: () => BrowserWindow | null
}): void {
  const { configStore, photoRepository, jobService, provenanceStore, fileService, getControlWindow } = deps

  // photo:select-directory
  ipcMain.handle('photo:select-directory', async () => {
    const win = getControlWindow()
    const result = await dialog.showOpenDialog(win ?? new BrowserWindow(), {
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // photo:add-directory
  ipcMain.handle('photo:add-directory', async (_event, path: string) => {
    if (!isAbsolutePath(path)) {
      throw new Error(`Invalid path: "${path}" is not an absolute path`)
    }
    const config = configStore.getConfig()
    const dirs = config.directories.includes(path)
      ? config.directories
      : [...config.directories, path]
    const results = photoRepository.scan(dirs, config.exclusions)
    if (!config.directories.includes(path)) {
      configStore.setConfig({ directories: dirs })
    }
    const entry = results.find((r) => r.path === path) ?? {
      path,
      validCount: 0,
      isAccessible: true
    }
    const photos = photoRepository.getAllPhotos().filter((p) => {
      const normalize = (s: string): string => s.replace(/\\/g, '/')
      const nPath = normalize(p.path)
      const nDir = normalize(path)
      const prefix = nDir.endsWith('/') ? nDir : nDir + '/'
      return nPath.startsWith(prefix) || nPath === nDir
    })
    return { entry, photos }
  })

  // photo:remove-directory
  ipcMain.handle('photo:remove-directory', async (_event, path: string) => {
    if (!isAbsolutePath(path)) {
      throw new Error(`Invalid path: "${path}" is not an absolute path`)
    }
    const config = configStore.getConfig()
    const newDirs = config.directories.filter((d) => d !== path)
    configStore.setConfig({ directories: newDirs })
    photoRepository.scan(newDirs, config.exclusions)
    return undefined
  })

  // photo:list-directories
  ipcMain.handle('photo:list-directories', async () => {
    const config = configStore.getConfig()
    return photoRepository.scan(config.directories, config.exclusions)
  })

  // photo:add-exclusion
  ipcMain.handle('photo:add-exclusion', async (_event, path: string, type: 'folder' | 'file') => {
    if (!isAbsolutePath(path)) {
      throw new Error(`Invalid path: "${path}" is not an absolute path`)
    }
    const config = configStore.getConfig()
    const exists = config.exclusions.some((e) => e.path === path)
    if (!exists) {
      configStore.setConfig({ exclusions: [...config.exclusions, { path, type }] })
    }
    return undefined
  })

  // photo:remove-exclusion
  ipcMain.handle('photo:remove-exclusion', async (_event, path: string) => {
    const config = configStore.getConfig()
    configStore.setConfig({ exclusions: config.exclusions.filter((e) => e.path !== path) })
    return undefined
  })

  // photo:list-exclusions
  ipcMain.handle('photo:list-exclusions', async () => {
    return configStore.getConfig().exclusions
  })

  // job:start
  ipcMain.handle('job:start', async (_event, options: JobStartOptions) => {
    return jobService.start(options)
  })

  // job:cancel
  ipcMain.handle('job:cancel', async (_event, jobId: string) => {
    if (jobId === 'current') {
      jobService.cancelCurrent()
    } else {
      jobService.cancel(jobId)
    }
  })


  // job:retry — 重试当前失败的 Job
  ipcMain.handle('job:retry', async () => {
    return jobService.retry()
  })

  // config:get / config:set
  ipcMain.handle('config:get', async () => {
    return configStore.getConfig()
  })

  ipcMain.handle('config:set', async (_event, partial: Partial<AppConfig>) => {
    configStore.setConfig(partial)
  })

  // env:get — 检查环境变量（用于 API Key 检测）
  ipcMain.handle('env:get', async (_event, name: string) => {
    const val = process.env[name]
    return val || null
  })

  // provenance:save / list / delete
  ipcMain.handle('provenance:save', async (_event, record) => {
    await provenanceStore.save(record)
  })

  ipcMain.handle('provenance:list', async () => {
    return provenanceStore.list()
  })

  ipcMain.handle('provenance:delete', async (_event, id: string) => {
    const record = (await provenanceStore.list()).find((r) => r.id === id)
    if (record?.generatedImagePath) {
      fileService.deleteGeneratedImage(record.generatedImagePath)
    }
    await provenanceStore.delete(id)
  })

  // file:save-generated-image
  ipcMain.handle('file:save-generated-image', async (_event, dataUrl: string, suggestedName: string) => {
    return fileService.saveImageFile(dataUrl, suggestedName)
  })

  // file:save-to-directory（一键保存到默认目录）
  ipcMain.handle('file:save-to-directory', async (_event, dataUrl: string, suggestedName: string) => {
    return fileService.saveToDirectory(dataUrl, suggestedName)
  })

  // file:select-save-directory（选择默认保存目录）
  ipcMain.handle('file:select-save-directory', async () => {
    const win = getControlWindow()
    const result = await dialog.showOpenDialog(win ?? new BrowserWindow(), {
      properties: ['openDirectory', 'createDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // file:open-image-viewer
  ipcMain.handle('file:open-image-viewer', async (_event, path: string) => {
    await fileService.openImageViewer(path)
  })

  // file:read-thumbnail
  ipcMain.handle('file:read-thumbnail', async (_event, path: string) => {
    return fileService.readImageAsDataUrl(path)
  })
}

