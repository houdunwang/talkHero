import { contextBridge, ipcRenderer } from 'electron'
import { INFERENCE_IPC } from '../types/ipc'
import type { EnvironmentSnapshot, TalkHeroResult, TaskSummary } from '../types/public'

export const inferencePreload = {
  getEnvironment: () =>
    ipcRenderer.invoke(INFERENCE_IPC.environment) as Promise<TalkHeroResult<EnvironmentSnapshot>>,
  getTasks: () => ipcRenderer.invoke(INFERENCE_IPC.tasks) as Promise<TalkHeroResult<TaskSummary[]>>,
  cancelTask: (taskId: string) =>
    ipcRenderer.invoke(INFERENCE_IPC.cancelTask, taskId) as Promise<TalkHeroResult<boolean>>
}

contextBridge.exposeInMainWorld('inference', inferencePreload)
