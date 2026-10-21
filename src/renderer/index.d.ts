import type { ElectronAPI } from '../shared/types/api'

declare global {
  interface Window {
    electronAPI: ElectronAPI
    triggerEvents: {
      sendStartDrag(screenX: number, screenY: number): void
      sendDragMove(screenX: number, screenY: number): void
      sendEndDrag(): void
    }
  }
}

export {}
