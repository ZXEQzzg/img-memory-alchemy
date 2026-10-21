import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../shared/types/api'

const api: ElectronAPI = {
  photo: {
    selectDirectory: () => ipcRenderer.invoke('photo:select-directory'),
    addDirectory: (path) => ipcRenderer.invoke('photo:add-directory', path),
    removeDirectory: (path) => ipcRenderer.invoke('photo:remove-directory', path),
    listDirectories: () => ipcRenderer.invoke('photo:list-directories'),
    addExclusion: (path, type) => ipcRenderer.invoke('photo:add-exclusion', path, type),
    removeExclusion: (path) => ipcRenderer.invoke('photo:remove-exclusion', path),
    listExclusions: () => ipcRenderer.invoke('photo:list-exclusions')
  },

  job: {
    start: (options) => ipcRenderer.invoke('job:start', options),
    cancel: (jobId) => ipcRenderer.invoke('job:cancel', jobId),
    retry: () => ipcRenderer.invoke('job:retry'),
    onStateChange: (cb) => {
      const handler = (_event: Electron.IpcRendererEvent, eventData: unknown) => {
        cb(eventData as Parameters<typeof cb>[0])
      }
      ipcRenderer.on('job:state-change', handler)
      return () => {
        ipcRenderer.removeListener('job:state-change', handler)
      }
    }
  },

  config: {
    get: () => ipcRenderer.invoke('config:get'),
    set: (partial) => ipcRenderer.invoke('config:set', partial)
  },

  provenance: {
    save: (record) => ipcRenderer.invoke('provenance:save', record),
    list: () => ipcRenderer.invoke('provenance:list'),
    delete: (id) => ipcRenderer.invoke('provenance:delete', id)
  },

  file: {
    saveGeneratedImage: (dataUrl, suggestedName) =>
      ipcRenderer.invoke('file:save-generated-image', dataUrl, suggestedName),
    saveToDirectory: (dataUrl, suggestedName) =>
      ipcRenderer.invoke('file:save-to-directory', dataUrl, suggestedName),
    selectSaveDirectory: () => ipcRenderer.invoke('file:select-save-directory'),
    openImageViewer: (path) => ipcRenderer.invoke('file:open-image-viewer', path),
    readThumbnail: (path) => ipcRenderer.invoke('file:read-thumbnail', path)
  },

  env: {
    get: (name) => ipcRenderer.invoke('env:get', name)
  },

  widget: {
    getTriggerBounds: () => ipcRenderer.invoke('widget:get-trigger-bounds'),
    getDropzoneBounds: () => ipcRenderer.invoke('widget:get-dropzone-bounds'),
    getDropzoneRect: () => ipcRenderer.invoke('widget:get-dropzone-rect'),
    setVisible: (visible) => ipcRenderer.invoke('widget:set-visible', visible),
    setAlwaysOnTop: (onTop) => ipcRenderer.invoke('widget:set-always-on-top', onTop),
    onDropzoneRect: (cb) => {
      const handler = (_event: Electron.IpcRendererEvent, rect: unknown) => {
        cb(rect as Parameters<typeof cb>[0])
      }
      ipcRenderer.on('widget:dropzone-rect', handler)
      return () => {
        ipcRenderer.removeListener('widget:dropzone-rect', handler)
      }
    },
    onCrossWindowHover: (cb) => {
      const handler = (_event: Electron.IpcRendererEvent, hovering: unknown) => {
        cb(hovering as Parameters<typeof cb>[0])
      }
      ipcRenderer.on('widget:cross-window-hover', handler)
      return () => {
        ipcRenderer.removeListener('widget:cross-window-hover', handler)
      }
    },
    onJobStateChange: (cb) => {
      const handler = (_event: Electron.IpcRendererEvent, event: unknown) => {
        cb(event as Parameters<typeof cb>[0])
      }
      ipcRenderer.on('job:state-change', handler)
      return () => {
        ipcRenderer.removeListener('job:state-change', handler)
      }
    }
  },

  reveal: {
    getLatest: () => ipcRenderer.invoke('reveal:get-latest'),
    onResult: (cb) => {
      const handler = (_event: Electron.IpcRendererEvent, result: unknown) => {
        cb(result as Parameters<typeof cb>[0])
      }
      ipcRenderer.on('reveal:result', handler)
      return () => {
        ipcRenderer.removeListener('reveal:result', handler)
      }
    }
  }
}

// 暴露 Trigger/DropZone 专用事件发送器
const triggerEvents = {
  sendStartDrag: (screenX: number, screenY: number) => ipcRenderer.send('widget:start-drag', screenX, screenY),
  sendDragMove: (screenX: number, screenY: number) => ipcRenderer.send('widget:drag-move', screenX, screenY),
  sendEndDrag: () => ipcRenderer.send('widget:end-drag')
}

contextBridge.exposeInMainWorld('electronAPI', api)
contextBridge.exposeInMainWorld('triggerEvents', triggerEvents)
