import { TaskRegistry, type TaskSnapshot } from './task-registry'

// TaskTransactionQueue 串行提交“内存状态 + 原子日志”，避免并发任务交错回滚。
export class TaskTransactionQueue {
  readonly #registry: TaskRegistry
  readonly #write: (snapshots: TaskSnapshot[]) => Promise<void>
  #queue = Promise.resolve()

  constructor(registry: TaskRegistry, write: (snapshots: TaskSnapshot[]) => Promise<void>) {
    this.#registry = registry
    this.#write = write
  }

  mutate<T>(mutation: () => T, rollbackOnFailure = true): Promise<T> {
    const transaction = this.#queue.then(async () => {
      const before = this.#registry.list()
      try {
        const result = mutation()
        await this.#write(this.#registry.list())
        return result
      } catch (error) {
        if (rollbackOnFailure) this.#registry.replace(before)
        throw error
      }
    })
    this.#queue = transaction.then(
      () => undefined,
      () => undefined
    )
    return transaction
  }

  flush(): Promise<void> {
    return this.#queue
  }
}
