import { v4 as uuidv4 } from 'uuid'
import type { JobState } from '../../shared/types/api'

// 合法状态转换表
const VALID_TRANSITIONS: Record<JobState, readonly JobState[]> = {
  idle: ['selecting'],
  selecting: ['describing', 'failed', 'cancelled'],
  describing: ['prompting', 'failed', 'cancelled'],
  prompting: ['moderating', 'failed', 'cancelled'],
  moderating: ['generating', 'failed', 'cancelled'],
  generating: ['succeeded', 'failed', 'cancelled'],
  succeeded: ['idle'],
  failed: ['idle'],
  cancelled: ['idle']
}

export class GenerationJob {
  readonly jobId: string
  private _state: JobState = 'idle'
  private abortController: AbortController = new AbortController()

  constructor() {
    this.jobId = uuidv4()
  }

  get state(): JobState {
    return this._state
  }

  get signal(): AbortSignal {
    return this.abortController.signal
  }

  /**
   * 转换到下一个状态。
   * @throws 若转换非法则抛出 Error
   */
  transition(next: JobState): void {
    const allowed = VALID_TRANSITIONS[this._state]
    if (!allowed.includes(next)) {
      const err = new Error(
        `[GenerationJob ${this.jobId}] Invalid transition: ${this._state} → ${next}`
      )
      console.error(err.message)
      throw err
    }
    this._state = next
  }

  /**
   * 取消任务：触发 AbortController，转换到 cancelled 状态。
   * 若已是终止状态则忽略。
   */
  cancel(): void {
    const terminal: JobState[] = ['succeeded', 'failed', 'cancelled', 'idle']
    if (terminal.includes(this._state)) return

    this.abortController.abort()
    this._state = 'cancelled'
  }

  /**
   * 重置到 idle，供 succeeded/failed/cancelled 后复用。
   * 同时创建新的 AbortController（旧的已失效）。
   */
  reset(): void {
    const resetFrom: JobState[] = ['succeeded', 'failed', 'cancelled']
    if (!resetFrom.includes(this._state)) {
      throw new Error(
        `[GenerationJob ${this.jobId}] Cannot reset from state: ${this._state}`
      )
    }
    this.abortController = new AbortController()
    this._state = 'idle'
  }

  /**
   * 判断任务是否处于活跃（进行中）状态
   */
  isActive(): boolean {
    const active: JobState[] = ['selecting', 'describing', 'prompting', 'moderating', 'generating']
    return active.includes(this._state)
  }
}
