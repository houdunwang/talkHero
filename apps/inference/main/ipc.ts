import { ipcMain } from 'electron'
import { INFERENCE_IPC } from '../types/ipc'
import type {
  TalkHeroResult,
  EnvironmentSnapshot,
  ResourceInstallSnapshot,
  TaskSummary
} from '../types/public'
import { getEnvironmentSnapshot } from './service'
import { cancelWorkerTask } from './worker-runtime'
import { authorizeInferenceClient, authorizeProductClient } from './ipc-security'
import { taskRegistry } from './task-service'
import { resourceInstallService } from './resource-install-service'

ipcMain.removeHandler(INFERENCE_IPC.environment)
ipcMain.handle(
  INFERENCE_IPC.environment,
  async (event, ...args: unknown[]): Promise<TalkHeroResult<EnvironmentSnapshot>> => {
    if (authorizeInferenceClient(event, 'environment') === null)
      return { ok: false, code: 'forbidden', message: '当前窗口无权访问推理状态' }
    if (args.length !== 0) return { ok: false, code: 'invalid-input', message: '请求参数无效' }
    return { ok: true, data: await getEnvironmentSnapshot() }
  }
)

ipcMain.removeHandler(INFERENCE_IPC.tasks)

const registerResourceInstallHandler = (
  channel: string,
  operation: () => Promise<ResourceInstallSnapshot> | ResourceInstallSnapshot
): void => {
  ipcMain.removeHandler(channel)
  ipcMain.handle(
    channel,
    async (event, ...args: unknown[]): Promise<TalkHeroResult<ResourceInstallSnapshot>> => {
      if (authorizeProductClient(event) === null)
        return { ok: false, code: 'forbidden', message: '当前窗口无权管理受管资源' }
      if (args.length) return { ok: false, code: 'invalid-input', message: '请求参数无效' }
      try {
        return { ok: true, data: await operation() }
      } catch (error) {
        return {
          ok: false,
          code: 'unavailable',
          message: error instanceof Error ? error.message : '受管资源操作失败'
        }
      }
    }
  )
}

registerResourceInstallHandler(INFERENCE_IPC.installResources, async () => {
  const environment = await getEnvironmentSnapshot()
  if (!environment.targetPlatform)
    throw new Error('完整本地推理首版仅支持 Windows 11 x64 + NVIDIA CUDA')
  if (!environment.gpu.detected)
    throw new Error('未检测到 NVIDIA 显卡或驱动，请先按 NVIDIA 官方指引安装驱动')
  return resourceInstallService.start()
})
registerResourceInstallHandler(INFERENCE_IPC.cancelResourceInstall, () =>
  resourceInstallService.cancel()
)

ipcMain.handle(INFERENCE_IPC.tasks, (event, ...args: unknown[]): TalkHeroResult<TaskSummary[]> => {
  if (authorizeProductClient(event) === null)
    return { ok: false, code: 'forbidden', message: '当前窗口无权访问任务状态' }
  if (args.length !== 0) return { ok: false, code: 'invalid-input', message: '请求参数无效' }
  return {
    ok: true,
    data: taskRegistry.list().map(({ id, operation, state, stage, progress }) => ({
      id,
      operation,
      state,
      stage,
      progress
    }))
  }
})

ipcMain.removeHandler(INFERENCE_IPC.cancelTask)
ipcMain.handle(
  INFERENCE_IPC.cancelTask,
  async (event, ...args: unknown[]): Promise<TalkHeroResult<boolean>> => {
    if (authorizeProductClient(event) === null) {
      return { ok: false, code: 'forbidden', message: '当前窗口无权取消任务' }
    }
    if (args.length !== 1 || typeof args[0] !== 'string' || !/^[0-9a-f-]{36}$/iu.test(args[0])) {
      return { ok: false, code: 'invalid-input', message: '任务 ID 无效' }
    }
    try {
      await cancelWorkerTask(args[0])
      return { ok: true, data: true }
    } catch (error) {
      return {
        ok: false,
        code: 'unavailable',
        message: error instanceof Error ? error.message : '任务取消失败'
      }
    }
  }
)
