import { app } from 'electron'
import { delimiter, join } from 'node:path'
import { getManagedResourceStatuses } from './resource-service'
import { flushTaskJournal, persistTaskMutation, taskRegistry } from './task-service'
import { WorkerClient, type WorkerOperation } from './worker-client'
import type { ManagedResourceName } from '../types/public'

let client: WorkerClient | null = null

const managedRoot = (): string => join(app.getPath('userData'), 'talkhero')

const workerScript = (): string =>
  app.isPackaged
    ? join(process.resourcesPath, 'talkhero-worker', 'worker.py')
    : join(app.getAppPath(), 'apps', 'inference', 'worker', 'worker.py')

const requiredResources = (operation: WorkerOperation): readonly ManagedResourceName[] => {
  switch (operation) {
    case 'environment.health':
      return ['python']
    case 'voice.create':
      return ['python', 'asr', 'ffmpeg']
    case 'voice.synthesize':
      return ['python', 'index-tts', 'asr']
    case 'video.inspect':
      return ['python', 'ffmpeg']
    case 'video.lipsync':
      return ['python', 'muse-talk', 'ffmpeg']
    case 'publish.cover':
      return ['python', 'ffmpeg']
    default:
      return []
  }
}

const createClient = (): WorkerClient => {
  const root = managedRoot()
  const pythonRoot = join(root, 'runtime', 'python')
  const ffmpegRoot = join(root, 'runtime', 'ffmpeg')
  const systemRoot = process.env.SystemRoot ?? process.env.WINDIR
  const fixedPath = [pythonRoot, join(pythonRoot, 'Scripts'), ffmpegRoot]
  if (systemRoot) fixedPath.push(join(systemRoot, 'System32'))
  return new WorkerClient({
    executable: join(pythonRoot, 'python.exe'),
    args: ['-I', workerScript()],
    cwd: root,
    env: {
      SystemRoot: process.env.SystemRoot,
      WINDIR: process.env.WINDIR,
      PATH: fixedPath.join(delimiter),
      PYTHONUTF8: '1',
      HF_HUB_OFFLINE: '1',
      TRANSFORMERS_OFFLINE: '1',
      HF_HOME: join(root, 'models', 'index-tts-2.5', 'checkpoints', 'hf_cache'),
      TALKHERO_FFMPEG: join(ffmpegRoot, 'ffmpeg.exe'),
      TALKHERO_FFPROBE: join(ffmpegRoot, 'ffprobe.exe'),
      TALKHERO_MANAGED_ROOT: root
    },
    handshakeTimeoutMs: 30_000
  })
}

const validateWorkerOutput = (
  operation: WorkerOperation,
  output: Record<string, string>
): Record<string, string> => {
  const expected: Partial<Record<WorkerOperation, readonly string[]>> = {
    'environment.health': ['pythonVersion', 'cuda', 'gpuName', 'vramBytes'],
    'voice.create': ['referenceAudioPath', 'transcriptPath', 'featuresPath'],
    'voice.synthesize': ['outputAudioPath'],
    'video.inspect': ['reportPath', 'usable'],
    'publish.cover': ['cover1', 'cover2', 'cover3', 'score1', 'score2', 'score3']
  }
  const keys = expected[operation]
  if (keys && Object.keys(output).sort().join('\0') !== [...keys].sort().join('\0')) {
    throw new Error('Worker 输出契约不匹配')
  }
  return output
}

export const runWorkerTask = async <T = Record<string, string>>(
  taskId: string,
  operation: WorkerOperation,
  payload: Record<string, unknown>,
  finalize?: (output: Record<string, string>) => Promise<T>
): Promise<T> => {
  const statuses = await getManagedResourceStatuses()
  const missing = requiredResources(operation).filter(
    (name) => !statuses.some((resource) => resource.name === name && resource.installed)
  )
  if (missing.length) throw new Error(`受管资源未就绪：${missing.join('、')}`)
  await persistTaskMutation(() => {
    taskRegistry.create(taskId, operation)
    taskRegistry.transition(taskId, 'running', { stage: 'worker-start', progress: 0 })
  })
  client ??= createClient()
  try {
    const rawOutput = await client.run({ taskId, operation, payload }, (message) =>
      persistTaskMutation(() =>
        taskRegistry.updateProgress(taskId, {
          stage: message.stage,
          progress: message.progress
        })
      )
    )
    const output = validateWorkerOutput(operation, rawOutput)
    const result = finalize ? await finalize(output) : (output as T)
    await persistTaskMutation(() => {
      if (operation === 'voice.synthesize')
        taskRegistry.attachOutput(taskId, `outputs/audio/${taskId}.wav`)
      if (operation === 'video.lipsync')
        taskRegistry.attachOutput(taskId, `outputs/video/${taskId}.mp4`)
      return taskRegistry.transition(taskId, 'completed', { stage: 'completed', progress: 100 })
    })
    return result
  } catch (error) {
    const current = taskRegistry.get(taskId)
    if (
      error instanceof Error &&
      (error.message === '任务已取消' || error.message.includes('取消超时'))
    ) {
      await persistTaskMutation(
        () =>
          taskRegistry.transition(taskId, 'cancelled', {
            stage: 'cancelled',
            progress: current?.progress ?? 0
          }),
        false
      )
    } else if (current && current.state !== 'failed') {
      await persistTaskMutation(
        () =>
          taskRegistry.transition(taskId, 'failed', {
            stage: 'failed',
            progress: current.progress
          }),
        false
      )
    }
    throw error
  }
}

export const cancelWorkerTask = async (taskId: string): Promise<void> => {
  const task = taskRegistry.get(taskId)
  if (!task || (task.state !== 'running' && task.state !== 'waiting-user'))
    throw new Error('任务不可取消')
  await persistTaskMutation(() => {
    const current = taskRegistry.get(taskId)
    if (!current || (current.state !== 'running' && current.state !== 'waiting-user')) {
      throw new Error('任务不可取消')
    }
    return taskRegistry.transition(taskId, 'cancelling', {
      stage: 'cancelling',
      progress: current.progress
    })
  })
  if (!client) throw new Error('Worker 未运行')
  await client.cancel(taskId)
}

export const stopWorker = async (): Promise<void> => {
  let persistenceError: unknown
  const active = taskRegistry
    .list()
    .filter((task) => ['queued', 'running', 'waiting-user', 'cancelling'].includes(task.state))
  for (const task of active) {
    const current = taskRegistry.get(task.id)
    if (current?.state === 'running' || current?.state === 'waiting-user') {
      try {
        await persistTaskMutation(() =>
          taskRegistry.transition(task.id, 'cancelling', {
            stage: 'app-exit',
            progress: current.progress
          })
        )
      } catch (error) {
        persistenceError ??= error
      }
    }
  }
  try {
    await client?.stop()
  } catch (error) {
    persistenceError ??= error
  } finally {
    client = null
  }
  try {
    await flushTaskJournal()
  } catch (error) {
    persistenceError ??= error
  }
  if (persistenceError) throw persistenceError
}
