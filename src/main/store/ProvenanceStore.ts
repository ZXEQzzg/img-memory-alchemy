import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { app } from 'electron'
import type { ProvenanceRecord } from '../../shared/types/api'

/**
 * ProvenanceStore — 溯源记录持久化存储
 * 将记录写入本地 JSON 文件，支持 save / list / delete 操作。
 */
export class ProvenanceStore {
  private records: ProvenanceRecord[] = []
  private filePath: string

  constructor(filePath?: string) {
    this.filePath = filePath ?? join(app.getPath('userData'), 'provenance.json')
    this.load()
  }

  private load(): void {
    try {
      if (!existsSync(this.filePath)) {
        this.records = []
        return
      }
      const raw = readFileSync(this.filePath, 'utf-8')
      this.records = JSON.parse(raw) as ProvenanceRecord[]
    } catch {
      this.records = []
    }
  }

  private persist(): void {
    try {
      const dir = dirname(this.filePath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      writeFileSync(this.filePath, JSON.stringify(this.records, null, 2), 'utf-8')
    } catch (err) {
      console.error('[ProvenanceStore] Failed to save:', err)
    }
  }

  async save(record: ProvenanceRecord): Promise<void> {
    this.records.push(record)
    this.persist()
  }

  async list(): Promise<ProvenanceRecord[]> {
    return [...this.records]
  }

  async delete(id: string): Promise<void> {
    this.records = this.records.filter((r) => r.id !== id)
    this.persist()
  }
}

