// Inference 主进程入口恢复任务日志后再注册受控环境与 Worker 编排边界。
import { app } from 'electron'
import { stopWorker } from './worker-runtime'
import { initializeTaskRegistry } from './task-service'
import { registerTalkHeroMediaProtocol } from './media-protocol'

let initialization: Promise<void> | null = null

export const initializeInference = (): Promise<void> => {
  initialization ??= Promise.all([initializeTaskRegistry(), registerTalkHeroMediaProtocol()]).then(
    async () => {
      await import('./ipc')
    }
  )
  return initialization
}

app.once('before-quit', (event) => {
  event.preventDefault()
  void stopWorker()
    .catch(() => console.error('TalkHero shutdown cleanup failed'))
    .finally(() => app.quit())
})
