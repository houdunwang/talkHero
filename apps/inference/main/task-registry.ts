import { canTransitionTask, type TaskState } from './contracts'

export type TaskSnapshot = {
  id: string
  operation: string
  outputRelativePath: string | null
  outputSha256: string | null
  state: TaskState
  stage: string
  progress: number
}

// TaskRegistry 集中执行合法状态转换，并把崩溃遗留状态恢复为安全终态。
export class TaskRegistry {
  readonly #tasks = new Map<string, TaskSnapshot>()
  readonly #onChange?: (snapshots: TaskSnapshot[]) => void

  constructor(onChange?: (snapshots: TaskSnapshot[]) => void) {
    this.#onChange = onChange
  }

  static restore(
    snapshots: TaskSnapshot[],
    onChange?: (snapshots: TaskSnapshot[]) => void
  ): TaskRegistry {
    const registry = new TaskRegistry(onChange)
    for (const snapshot of snapshots) {
      const safeState: TaskState =
        snapshot.state === 'cancelling'
          ? 'cancelled'
          : ['queued', 'running', 'waiting-user'].includes(snapshot.state)
            ? 'failed'
            : snapshot.state
      registry.#tasks.set(snapshot.id, { ...snapshot, state: safeState })
    }
    registry.#notify()
    return registry
  }

  create(id: string, operation: string): TaskSnapshot {
    if (!id.trim() || this.#tasks.has(id)) throw new Error('任务 ID 无效或已存在')
    if (!operation.trim()) throw new Error('任务 operation 无效')
    const task: TaskSnapshot = {
      id,
      operation,
      outputRelativePath: null,
      outputSha256: null,
      state: 'queued',
      stage: 'waiting',
      progress: 0
    }
    this.#tasks.set(id, task)
    this.#notify()
    return { ...task }
  }

  get(id: string): TaskSnapshot | undefined {
    const task = this.#tasks.get(id)
    return task ? { ...task } : undefined
  }

  list(): TaskSnapshot[] {
    return [...this.#tasks.values()].map((task) => ({ ...task }))
  }

  remove(id: string): boolean {
    const current = this.#tasks.get(id)
    if (!current) throw new Error('任务不存在')
    if (!['cancelled', 'failed', 'completed'].includes(current.state))
      throw new Error('任务尚未结束，不能移除')
    const removed = this.#tasks.delete(id)
    this.#notify()
    return removed
  }

  replace(snapshots: TaskSnapshot[]): void {
    this.#tasks.clear()
    for (const snapshot of snapshots) this.#tasks.set(snapshot.id, { ...snapshot })
  }

  transition(
    id: string,
    state: TaskState,
    update: Pick<TaskSnapshot, 'stage' | 'progress'>
  ): TaskSnapshot {
    const current = this.#tasks.get(id)
    if (!current) throw new Error('任务不存在')
    if (!canTransitionTask(current.state, state)) throw new Error('非法任务状态转换')
    if (
      !update.stage.trim() ||
      !Number.isFinite(update.progress) ||
      update.progress < 0 ||
      update.progress > 100
    ) {
      throw new Error('任务进度无效')
    }
    const next = { ...current, ...update, state }
    this.#tasks.set(id, next)
    this.#notify()
    return { ...next }
  }

  updateProgress(id: string, update: Pick<TaskSnapshot, 'stage' | 'progress'>): TaskSnapshot {
    const current = this.#tasks.get(id)
    if (!current) throw new Error('任务不存在')
    // 取消请求写盘和 Worker 收到 cancel 之间可能仍有在途进度；忽略它，
    // 避免正常竞态被升级成整个 Worker 的协议失败。
    if (current.state === 'cancelling') return { ...current }
    if (current.state !== 'running' && current.state !== 'waiting-user') {
      throw new Error('任务不在可更新状态')
    }
    if (
      !update.stage.trim() ||
      !Number.isFinite(update.progress) ||
      update.progress < current.progress ||
      update.progress > 100
    ) {
      throw new Error('任务进度无效')
    }
    const next = { ...current, ...update }
    this.#tasks.set(id, next)
    this.#notify()
    return { ...next }
  }

  attachOutput(id: string, relativePath: string, sha256: string): TaskSnapshot {
    const current = this.#tasks.get(id)
    if (!current || current.state !== 'running') throw new Error('任务不在可记录输出状态')
    if (
      !/^outputs\/(audio|video)\/[0-9a-f-]{36}\.(wav|mp4)$/iu.test(relativePath) ||
      relativePath.includes('..') ||
      !/^[a-f0-9]{64}$/u.test(sha256)
    )
      throw new Error('任务输出身份无效')
    const next = { ...current, outputRelativePath: relativePath, outputSha256: sha256 }
    this.#tasks.set(id, next)
    this.#notify()
    return { ...next }
  }

  #notify(): void {
    this.#onChange?.(this.list())
  }
}
