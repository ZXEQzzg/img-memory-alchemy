import 'dotenv/config'
import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'path'
import { ConfigStore } from './store/ConfigStore'
import { PhotoRepository } from './photo/PhotoRepository'
import { ProvenanceStore } from './store/ProvenanceStore'
import { FileService } from './file/FileService'
import { registerIpcHandlers } from './ipc'
import { createModelGateway } from './gateway/createModelGateway'
import { GenerationJobService } from './job/GenerationJobService'
import type { JobStateEvent, ProvenanceRecord } from '../shared/types/api'

// ==============================
// 单例服务
// ==============================
let _configStore: ConfigStore | null = null
let _provenanceStore: ProvenanceStore | null = null
let _fileService: FileService | null = null
let _jobService: GenerationJobService | null = null

export function getConfigStore(): ConfigStore {
  if (!_configStore) throw new Error('ConfigStore accessed before app is ready')
  return _configStore
}

// ==============================
// 窗口实例
// ==============================
let controlWindow: BrowserWindow | null = null
let triggerWindow: BrowserWindow | null = null
let dropzoneWindow: BrowserWindow | null = null
let revealWindow: BrowserWindow | null = null
let latestResult: { imageDataUrl: string; provenance: ProvenanceRecord } | null = null

export function getControlWindow(): BrowserWindow | null {
  return controlWindow
}

export function getWidgetWindow(): BrowserWindow | null {
  return dropzoneWindow
}

export function getTriggerWindow(): BrowserWindow | null {
  return triggerWindow
}

export function getDropzoneWindow(): BrowserWindow | null {
  return dropzoneWindow
}

// ==============================
// 工具函数
// ==============================
function getRendererUrl(fileName: string): string | null {
  const base = process.env['ELECTRON_RENDERER_URL']
  return base ? base + '/' + fileName : null
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// ==============================
// 创建窗口
// ==============================
function createControlWindow(): void {
  controlWindow = new BrowserWindow({
    width: 800,
    height: 600,
    resizable: true,
    title: '记忆炼金 — 控制页',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  const url = getRendererUrl('index.html')
  if (url) controlWindow.loadURL(url)
  else controlWindow.loadFile(join(__dirname, '../renderer/index.html'))

  controlWindow.on('closed', () => {
    controlWindow = null
    if (triggerWindow) triggerWindow.close()
    if (dropzoneWindow) dropzoneWindow.close()
    if (revealWindow) revealWindow.close()
  })
}

function createTriggerWindow(): void {
  const store = getConfigStore()
  const bounds = store.getConfig().triggerBounds
  const w = clamp(bounds.width, 40, 120)
  const h = clamp(bounds.height, 40, 120)
  triggerFixedWidth = w
  triggerFixedHeight = h

  triggerWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: w,
    height: h,
    frame: false,
    transparent: true,
    alwaysOnTop: store.getConfig().widgetAlwaysOnTop,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    title: '触发物',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  const url = getRendererUrl('trigger.html')
  if (url) triggerWindow.loadURL(url)
  else triggerWindow.loadFile(join(__dirname, '../renderer/trigger.html'))

  if (!store.getConfig().widgetVisible) triggerWindow.hide()

  triggerWindow.on('closed', () => { triggerWindow = null })
}

function createDropzoneWindow(): void {
  const store = getConfigStore()
  const bounds = store.getConfig().dropzoneBounds
  const w = clamp(bounds.width, 80, 500)
  const h = clamp(bounds.height, 80, 500)
  const scale = store.getConfig().dropzoneScale ?? 1

  dropzoneWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: Math.round(w * scale),
    height: Math.round(h * scale),
    frame: false,
    transparent: true,
    alwaysOnTop: store.getConfig().widgetAlwaysOnTop,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    title: '目标区',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  const url = getRendererUrl('dropzone.html')
  if (url) dropzoneWindow.loadURL(url)
  else dropzoneWindow.loadFile(join(__dirname, '../renderer/dropzone.html'))

  if (!store.getConfig().widgetVisible) dropzoneWindow.hide()

  // Dropzone 移动：native -webkit-app-region:drag；仅持久化位置（尺寸固定，避免 DPI 缩放导致越存越大）
  dropzoneWindow.on('moved', () => {
    if (dropzoneWindow) {
      const b = dropzoneWindow.getBounds()
      const cur = getConfigStore().getConfig().dropzoneBounds
      getConfigStore().setConfig({
        dropzoneBounds: { x: b.x, y: b.y, width: cur.width, height: cur.height }
      })
    }
  })

  dropzoneWindow.on('closed', () => { dropzoneWindow = null })
}

// ==============================
// 揭晓窗口（生成成功后自动弹出）
// ==============================
function createRevealWindow(): void {
  revealWindow = new BrowserWindow({
    width: 560,
    height: 760,
    resizable: true,
    title: '记忆炼金 — 成品揭晓',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  const url = getRendererUrl('reveal.html')
  if (url) revealWindow.loadURL(url)
  else revealWindow.loadFile(join(__dirname, '../renderer/reveal.html'))

  revealWindow.on('closed', () => { revealWindow = null })
}

function openRevealWindow(result: { imageDataUrl: string; provenance: ProvenanceRecord }): void {
  latestResult = result

  if (revealWindow && !revealWindow.isDestroyed()) {
    revealWindow.webContents.send('reveal:result', result)
    if (revealWindow.isMinimized()) revealWindow.restore()
    revealWindow.show()
    revealWindow.focus()
    return
  }

  createRevealWindow()
  revealWindow?.webContents.once('did-finish-load', () => {
    if (revealWindow && !revealWindow.isDestroyed()) {
      revealWindow.webContents.send('reveal:result', result)
    }
  })
}

// ==============================
// Cross-window hover/drop detection
// ==============================
let wasHovering = false

function rectsOverlap(a: Electron.Rectangle, b: Electron.Rectangle): boolean {
  return !(a.x + a.width < b.x || b.x + b.width < a.x ||
           a.y + a.height < b.y || b.y + b.height < a.y)
}

/**
 * 悬停判定：以「钥匙窗口与宝箱窗口是否相交」为准（而非光标位置）。
 * 相交时向两个窗口广播 hover 状态，用于宝箱发光。
 */
function updateHoverState(): void {
  if (!triggerWindow || triggerWindow.isDestroyed() ||
      !dropzoneWindow || dropzoneWindow.isDestroyed()) return
  const tb = triggerWindow.getBounds()
  const db = dropzoneWindow.getBounds()
  const hovering = rectsOverlap(tb, db)
  if (hovering !== wasHovering) {
    wasHovering = hovering
    triggerWindow.webContents.send('widget:cross-window-hover', hovering)
    dropzoneWindow.webContents.send('widget:cross-window-hover', hovering)
  }
}

// ==============================
// 自定义拖拽：按下开始跟随光标，松开才判定是否触发
// ==============================
let isTriggerDragging = false
let dragGrabScreenX = 0
let dragGrabScreenY = 0
let dragGrabBoundsX = 0
let dragGrabBoundsY = 0
let triggerFixedWidth = 80
let triggerFixedHeight = 80

function startTriggerDrag(screenX: number, screenY: number): void {
  if (!triggerWindow || triggerWindow.isDestroyed()) return
  const b = triggerWindow.getBounds()
  dragGrabScreenX = screenX
  dragGrabScreenY = screenY
  dragGrabBoundsX = b.x
  dragGrabBoundsY = b.y
  isTriggerDragging = true
}

function moveTriggerDrag(screenX: number, screenY: number): void {
  if (!isTriggerDragging || !triggerWindow || triggerWindow.isDestroyed()) return
  const dx = screenX - dragGrabScreenX
  const dy = screenY - dragGrabScreenY
  const willMove = Math.abs(dx) > 3 || Math.abs(dy) > 3
  // 拖动阈值：光标移动超过 3px 才跟随，避免点击时轻微抖动导致钥匙漂移
  if (willMove) {
    // 用 setBounds 固定宽高（不能用 setPosition，否则在 DPI 缩放+透明窗口下每次都会放大 1px）
    triggerWindow.setBounds({
      x: dragGrabBoundsX + dx,
      y: dragGrabBoundsY + dy,
      width: triggerFixedWidth,
      height: triggerFixedHeight
    })
  }
  updateHoverState()
}

function endTriggerDrag(): void {
  if (!isTriggerDragging) return
  isTriggerDragging = false

  if (!triggerWindow || triggerWindow.isDestroyed() ||
      !dropzoneWindow || dropzoneWindow.isDestroyed()) return

  const tb = triggerWindow.getBounds()
  const db = dropzoneWindow.getBounds()
  const triggered = rectsOverlap(tb, db)

  // 复位悬停发光，避免钥匙仍压在宝箱上保持发光状态
  if (wasHovering) {
    wasHovering = false
    triggerWindow.webContents.send('widget:cross-window-hover', false)
    dropzoneWindow.webContents.send('widget:cross-window-hover', false)
  }

  const cur = getConfigStore().getConfig().triggerBounds

  if (triggered) {
    // 触发成功：钥匙复位到拖拽前的位置，避免与宝箱持续重叠造成误触发
    triggerWindow.setBounds({
      x: dragGrabBoundsX,
      y: dragGrabBoundsY,
      width: triggerFixedWidth,
      height: triggerFixedHeight
    })
    getConfigStore().setConfig({
      triggerBounds: { x: dragGrabBoundsX, y: dragGrabBoundsY, width: cur.width, height: cur.height }
    })
    triggerGeneration()
  } else {
    // 未触发：保存钥匙最终位置（允许自由摆放钥匙）
    getConfigStore().setConfig({
      triggerBounds: { x: tb.x, y: tb.y, width: cur.width, height: cur.height }
    })
  }
}

function triggerGeneration(): void {
  if (!_jobService || !_configStore) return

  const config = _configStore.getConfig()
  _jobService.start({ referenceCount: config.referenceCount })
    .catch((err) => {
      console.error('[Widget] Job start failed:', err)
    })
}

// ==============================
// Widget IPC Handlers
// ==============================
function registerWidgetIpcHandlers(): void {
  ipcMain.handle('widget:get-trigger-bounds', () => {
    return triggerWindow && !triggerWindow.isDestroyed()
      ? triggerWindow.getBounds()
      : { x: 0, y: 0, width: 0, height: 0 }
  })

  ipcMain.handle('widget:get-dropzone-bounds', () => {
    return dropzoneWindow && !dropzoneWindow.isDestroyed()
      ? dropzoneWindow.getBounds()
      : { x: 0, y: 0, width: 0, height: 0 }
  })

  ipcMain.handle('widget:get-dropzone-rect', () => {
    return dropzoneWindow && !dropzoneWindow.isDestroyed()
      ? dropzoneWindow.getBounds()
      : { x: 0, y: 0, width: 0, height: 0 }
  })

  // 显示 / 隐藏桌宠（钥匙 + 宝箱）
  ipcMain.handle('widget:set-visible', (_event, visible: boolean) => {
    getConfigStore().setConfig({ widgetVisible: visible })
    if (triggerWindow && !triggerWindow.isDestroyed()) {
      if (visible) triggerWindow.show()
      else triggerWindow.hide()
    }
    if (dropzoneWindow && !dropzoneWindow.isDestroyed()) {
      if (visible) dropzoneWindow.show()
      else dropzoneWindow.hide()
    }
  })

  // 是否置顶（降低层级：默认不置顶，与普通浏览器同级）
  ipcMain.handle('widget:set-always-on-top', (_event, onTop: boolean) => {
    getConfigStore().setConfig({ widgetAlwaysOnTop: onTop })
    if (triggerWindow && !triggerWindow.isDestroyed()) triggerWindow.setAlwaysOnTop(onTop)
    if (dropzoneWindow && !dropzoneWindow.isDestroyed()) dropzoneWindow.setAlwaysOnTop(onTop)
  })

  // 揭晓窗口：取最新结果
  ipcMain.handle('reveal:get-latest', () => latestResult)

  // 自定义拖拽：渲染进程通过 mousemove 的屏幕坐标驱动窗口移动
  ipcMain.on('widget:start-drag', (_event, screenX: number, screenY: number) => { startTriggerDrag(screenX, screenY) })
  ipcMain.on('widget:drag-move', (_event, screenX: number, screenY: number) => { moveTriggerDrag(screenX, screenY) })
  ipcMain.on('widget:end-drag', () => { endTriggerDrag() })
}

// ==============================
// Job 状态广播辅助
// ==============================
function broadcastJobEvent(event: JobStateEvent): void {
  if (triggerWindow && !triggerWindow.isDestroyed()) {
    triggerWindow.webContents.send('job:state-change', event)
  }
  if (controlWindow && !controlWindow.isDestroyed()) {
    controlWindow.webContents.send('job:state-change', event)
  }
}

// ==============================
// App 生命周期
// ==============================
app.whenReady().then(() => {
  // 去掉默认的 File/Edit/View/Window/Help 菜单栏（对本应用无关，且避免误触快捷键）
  Menu.setApplicationMenu(null)

  _configStore = new ConfigStore()
  _provenanceStore = new ProvenanceStore()
  _fileService = new FileService()

  ;(app as unknown as Record<string, unknown>)._imgAlchemyConfigStore = _configStore

  const photoRepository = new PhotoRepository()
  // 启动时扫描已保存目录，避免重启后照片池为空（无需先打开控制页）
  {
    const startupConfig = _configStore.getConfig()
    if (startupConfig.directories.length > 0) {
      photoRepository.scan(startupConfig.directories, startupConfig.exclusions)
    }
  }
  const gateway = createModelGateway(_configStore.getConfig().mode, __dirname)

  _jobService = new GenerationJobService(
    gateway,
    photoRepository,
    () => {
      if (dropzoneWindow && !dropzoneWindow.isDestroyed()) return dropzoneWindow
      return null
    },
    () => _configStore!.getConfig(),
    _provenanceStore
  )

  // 注册广播钩子：job 状态同时推送到 triggerWindow / controlWindow；成功时弹揭晓窗口
  _jobService.onEmit((event: JobStateEvent) => {
    broadcastJobEvent(event)
    if (event.state === 'succeeded' && event.result) {
      openRevealWindow(event.result)
    }
  })

  registerIpcHandlers({
    configStore: _configStore,
    photoRepository,
    jobService: _jobService,
    provenanceStore: _provenanceStore,
    fileService: _fileService,
    getControlWindow,
    getWidgetWindow
  })

  registerWidgetIpcHandlers()

  createControlWindow()
  createTriggerWindow()
  createDropzoneWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createControlWindow()
      createTriggerWindow()
      createDropzoneWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
