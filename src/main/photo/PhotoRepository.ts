import { readdirSync, statSync } from 'fs'
import { join, extname, basename } from 'path'
import type { PhotoRecord, DirectoryEntry, ExclusionEntry } from '../../shared/types/api'

export const VALID_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'] as const
export type ValidExtension = (typeof VALID_EXTENSIONS)[number]

export interface SampleOptions {
  count: 1 | 2 | 3
  lastBatch?: string[]
}

export class PhotoRepository {
  private photos: PhotoRecord[] = []

  scan(directories: string[], exclusions: ExclusionEntry[]): DirectoryEntry[] {
    const results: DirectoryEntry[] = []
    const allPhotos: PhotoRecord[] = []

    for (const dir of directories) {
      const entry = this.scanDirectory(dir, exclusions, allPhotos)
      results.push(entry)
    }

    this.photos = allPhotos
    return results
  }

  private scanDirectory(
    dir: string,
    exclusions: ExclusionEntry[],
    accumulator: PhotoRecord[]
  ): DirectoryEntry {
    try {
      const files = this.listFilesRecursive(dir)
      let validCount = 0
      let skippedCount = 0

      for (const filePath of files) {
        const ext = extname(filePath).toLowerCase()
        if (!(VALID_EXTENSIONS as readonly string[]).includes(ext)) continue

        const isExcluded = this.isExcluded(filePath, exclusions)
        const record = this.makePhotoRecord(filePath, isExcluded)
        accumulator.push(record)

        if (!record.isValid) {
          skippedCount++
        } else if (!record.isExcluded) {
          validCount++
        }
      }

      return {
        path: dir,
        validCount,
        isAccessible: true,
        errorReason: skippedCount > 0 ? `跳过 ${skippedCount} 个损坏/不可访问文件` : undefined
      }
    } catch (err) {
      return {
        path: dir,
        validCount: 0,
        isAccessible: false,
        errorReason: err instanceof Error ? err.message : '无法访问该目录'
      }
    }
  }

  private listFilesRecursive(dir: string): string[] {
    const results: string[] = []
    try {
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = join(dir, entry.name)
        if (entry.isDirectory()) {
          results.push(...this.listFilesRecursive(fullPath))
        } else if (entry.isFile()) {
          results.push(fullPath)
        }
      }
    } catch {
      // 权限不足的子目录跳过
    }
    return results
  }

  private makePhotoRecord(filePath: string, isExcluded: boolean): PhotoRecord {
    try {
      const stat = statSync(filePath)
      if (!stat.isFile() || stat.size === 0) {
        return { path: filePath, filename: basename(filePath), size: 0, isValid: false, isExcluded }
      }
      return { path: filePath, filename: basename(filePath), size: stat.size, isValid: true, isExcluded }
    } catch {
      return { path: filePath, filename: basename(filePath), size: 0, isValid: false, isExcluded }
    }
  }

  isExcluded(filePath: string, exclusions: ExclusionEntry[]): boolean {
    for (const ex of exclusions) {
      if (ex.type === 'folder') {
        const normalize = (p: string): string => p.replace(/\\/g, '/')
        const nFile = normalize(filePath)
        const nEx = normalize(ex.path)
        const prefix = nEx.endsWith('/') ? nEx : nEx + '/'
        if (nFile.startsWith(prefix) || nFile === nEx) return true
      } else {
        if (filePath === ex.path) return true
      }
    }
    return false
  }

  getValidPhotos(): PhotoRecord[] {
    return this.photos.filter((p) => p.isValid && !p.isExcluded)
  }

  getAllPhotos(): PhotoRecord[] {
    return [...this.photos]
  }

  sample(options: SampleOptions): PhotoRecord[] {
    const pool = this.getValidPhotos()
    const count = options.count
    const lastBatch = options.lastBatch ?? []

    if (pool.length === 0) return []
    if (pool.length <= count) return [...pool]

    // Fisher-Yates shuffle
    const shuffle = <T>(arr: T[]): T[] => {
      const a = [...arr]
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
      }
      return a
    }

    const lastBatchSet = new Set(lastBatch)

    // 将 pool 分为「上次未选中」和「上次选中」两组
    const fresh = pool.filter((p) => !lastBatchSet.has(p.path))
    const repeated = pool.filter((p) => lastBatchSet.has(p.path))

    let selected: PhotoRecord[]

    if (fresh.length >= count) {
      // 有足够的新照片
      selected = shuffle(fresh).slice(0, count)
    } else {
      // 先用完新照片，再从上次选中中补充
      selected = [...shuffle(fresh), ...shuffle(repeated)].slice(0, count)
    }

    return selected
  }
}
