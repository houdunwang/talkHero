import { ipcMain } from 'electron'
import { INFERENCE_IPC } from '../types/ipc'
import type { TalkHeroResult, EnvironmentSnapshot, TaskSummary } from '../types/public'
import { getEnvironmentSnapshot } from './service'
import { cancelWorkerTask } from './worker-runtime'
import { authorizeTalkHeroClient } from './ipc-security'
import { taskRegistry } from './task-service'

ipcMain.removeHandler(INFERENCE_IPC.environment)
ipcMain.handle(
  INFERENCE_IPC.environment,
  async (event, ...args: unknown[]): Promise<TalkHeroResult<EnvironmentSnapshot>> => {
    if (authorizeTalkHeroClient(event) === null)
      return { ok: false, code: 'forbidden', message: '当前窗口无权访问推理状态' }
    if (args.length !== 0) return { ok: false, code: 'invalid-input', message: '请求参数无效' }
    return { ok: true, data: await getEnvironmentSnapshot() }
  }
)

ipcMain.removeHandler(INFERENCE_IPC.tasks)
ipcMain.handle(INFERENCE_IPC.tasks, (event, ...args: unknown[]): TalkHeroResult<TaskSummary[]> => {
  if (authorizeTalkHeroClient(event) === null)
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
    if (authorizeTalkHeroClient(event) === null) {
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
