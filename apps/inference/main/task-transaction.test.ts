import { describe, expect, it } from 'vitest'
import { TaskRegistry } from './task-registry'
import { TaskTransactionQueue } from './task-transaction'

describe('TaskTransactionQueue', () => {
  it('serializes concurrent mutations and rolls back only the failed transaction', async () => {
    const registry = new TaskRegistry()
    const writes: string[][] = []
    let attempt = 0
    const queue = new TaskTransactionQueue(registry, async (snapshots) => {
      attempt += 1
      if (attempt === 1) throw new Error('disk full')
      writes.push(snapshots.map((task) => task.id))
    })

    const first = queue.mutate(() => registry.create('task-a', 'test.complete'))
    const second = queue.mutate(() => registry.create('task-b', 'test.complete'))
    await expect(first).rejects.toThrow('disk full')
    await expect(second).resolves.toMatchObject({ id: 'task-b' })
    await queue.flush()

    expect(registry.list().map((task) => task.id)).toEqual(['task-b'])
    expect(writes).toEqual([['task-b']])
  })

  it('rolls back partial registry changes when the mutation itself throws', async () => {
    const registry = new TaskRegistry()
    const queue = new TaskTransactionQueue(registry, async () => undefined)

    await expect(
      queue.mutate(() => {
        registry.create('partial-task', 'test.complete')
        throw new Error('mutation failed')
      })
    ).rejects.toThrow('mutation failed')

    expect(registry.list()).toEqual([])
  })
})
