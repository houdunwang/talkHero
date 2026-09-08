import { app } from 'electron'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { TaskRegistry, type TaskSnapshot } from './task-registry'
import { TaskTransactionQueue } from './task-transaction'

export let taskRegistry = new TaskRegistry()

const isTaskSnapshot = (value: unknown): value is TaskSnapshot => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const task = value as Partial<TaskSnapshot>
  return (
    typeof task.id === 'string' &&
    typeof task.operation === 'string' &&
    task.operation.trim().length > 0 &&
    (task.outputRelativePath === null ||
      (typeof task.outputRelativePath === 'string' &&
        /^outputs\/(audio|video)\/[0-9a-f-]{36}\.(wav|mp4)$/iu.test(task.outputRelativePath))) &&
    (task.outputSha256 === null ||
      (typeof task.outputSha256 === 'string' && /^[a-f0-9]{64}$/u.test(task.outputSha256))) &&
    (task.outputRelativePath === null) === (task.outputSha256 === null) &&
    typeof task.state === 'string' &&
    [
      'queued',
      'running',
      'waiting-user',
      'cancelling',
      'cancelled',
      'failed',
      'completed'
    ].includes(task.state) &&
    typeof task.stage === 'string' &&
    typeof task.progress === 'number' &&
    Number.isFinite(task.progress) &&
    task.progress >= 0 &&
    task.progress <= 100
  )
}

const journalPath = (): string => join(app.getPath('userData'), 'talkhero', 'tasks.json')

const writeSnapshots = async (snapshots: TaskSnapshot[]): Promise<void> => {
  const target = journalPath()
  await mkdir(join(app.getPath('userData'), 'talkhero'), { recursive: true })
  const temporary = `${target}.${randomUUID()}.tmp`
  await writeFile(temporary, JSON.stringify(snapshots), { encoding: 'utf8', flag: 'wx' })
  await rename(temporary, target)
}

let transactions = new TaskTransactionQueue(taskRegistry, writeSnapshots)

export const flushTaskJournal = async (): Promise<void> => {
  await transactions.flush()
}

export const persistTaskMutation = async <T>(
  mutation: () => T,
  rollbackOnFailure = true
): Promise<T> => {
  return transactions.mutate(mutation, rollbackOnFailure).catch((error: unknown) => {
    console.error('TalkHero task journal write failed')
    throw error
  })
}

export const initializeTaskRegistry = async (): Promise<void> => {
  let snapshots: TaskSnapshot[] = []
  try {
    const value: unknown = JSON.parse(await readFile(journalPath(), 'utf8'))
    if (!Array.isArray(value) || !value.every(isTaskSnapshot)) throw new Error('invalid journal')
    snapshots = value
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
      console.error('TalkHero task journal read failed')
      snapshots = [
        {
          id: randomUUID(),
          operation: 'task-journal.recovery',
          outputRelativePath: null,
          outputSha256: null,
          state: 'failed',
          stage: 'task-journal-corrupt',
          progress: 0
        }
      ]
    }
  }
  taskRegistry = TaskRegistry.restore(snapshots)
  transactions = new TaskTransactionQueue(taskRegistry, writeSnapshots)
  await writeSnapshots(taskRegistry.list())
}
