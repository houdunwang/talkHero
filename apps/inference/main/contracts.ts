import { isAbsolute, relative, resolve } from 'node:path'

// Inference 对外协议和状态转换的唯一纯逻辑边界。
export const PROTOCOL_VERSION = '1.0' as const

export type InferenceOperation = 'environment' | 'tasks' | 'cancelTask'

export const canAccessInferenceOperation = (
  _operation: InferenceOperation,
  windowName: string
): boolean => windowName === 'setting'

export type TaskState =
  'queued' | 'running' | 'waiting-user' | 'cancelling' | 'cancelled' | 'failed' | 'completed'

export type WorkerMessage =
  | { version: typeof PROTOCOL_VERSION; type: 'ready' }
  | {
      version: typeof PROTOCOL_VERSION
      type: 'progress'
      taskId: string
      progress: number
      stage: string
    }
  | {
      version: typeof PROTOCOL_VERSION
      type: 'completed'
      taskId: string
      output: Record<string, string>
    }
  | {
      version: typeof PROTOCOL_VERSION
      type: 'failed'
      taskId: string
      code: string
      message: string
    }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

export const parseWorkerMessage = (value: unknown): WorkerMessage => {
  if (!isRecord(value)) throw new Error('Worker 消息无效')
  if (value.version !== PROTOCOL_VERSION) throw new Error('协议版本不匹配')

  if (value.type === 'ready') return { version: PROTOCOL_VERSION, type: 'ready' }
  if (!isNonEmptyString(value.taskId)) throw new Error('Worker 消息无效')

  if (
    value.type === 'progress' &&
    typeof value.progress === 'number' &&
    Number.isFinite(value.progress) &&
    value.progress >= 0 &&
    value.progress <= 100 &&
    isNonEmptyString(value.stage)
  ) {
    return {
      version: PROTOCOL_VERSION,
      type: 'progress',
      taskId: value.taskId,
      progress: value.progress,
      stage: value.stage
    }
  }

  if (value.type === 'completed' && isRecord(value.output)) {
    const entries = Object.entries(value.output)
    if (entries.every(([key, item]) => isNonEmptyString(key) && typeof item === 'string')) {
      return {
        version: PROTOCOL_VERSION,
        type: 'completed',
        taskId: value.taskId,
        output: value.output as Record<string, string>
      }
    }
  }

  if (value.type === 'failed' && isNonEmptyString(value.code) && isNonEmptyString(value.message)) {
    return {
      version: PROTOCOL_VERSION,
      type: 'failed',
      taskId: value.taskId,
      code: value.code,
      message: value.message
    }
  }

  throw new Error('Worker 消息无效')
}

const TASK_TRANSITIONS: Readonly<Record<TaskState, readonly TaskState[]>> = {
  queued: ['running', 'cancelled', 'failed'],
  running: ['waiting-user', 'cancelling', 'failed', 'completed'],
  'waiting-user': ['running', 'cancelling', 'failed'],
  cancelling: ['cancelled', 'failed', 'completed'],
  cancelled: [],
  failed: [],
  completed: []
}

export const canTransitionTask = (from: TaskState, to: TaskState): boolean =>
  TASK_TRANSITIONS[from].includes(to)

export type ComputeMode = 'recommended' | 'minimum' | 'compatible' | 'unsupported'

export const classifyComputeMode = (input: {
  platform: NodeJS.Platform
  nvidia: boolean
  vramGb: number
  cuda: boolean
}): ComputeMode => {
  if (input.platform !== 'win32' || !input.nvidia || !input.cuda || input.vramGb < 4)
    return 'unsupported'
  if (input.vramGb < 6) return 'compatible'
  if (input.vramGb < 8) return 'minimum'
  return 'recommended'
}

export const resolveManagedPath = (managedRoot: string, requestedPath: string): string => {
  if (isAbsolute(requestedPath)) throw new Error('路径必须是相对路径')
  const root = resolve(managedRoot)
  const candidate = resolve(root, requestedPath)
  const relation = relative(root, candidate)
  if (
    relation === '..' ||
    relation.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) ||
    isAbsolute(relation)
  ) {
    throw new Error('路径越界')
  }
  return candidate
}
