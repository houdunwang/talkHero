import { getWindowName } from '@apps/core/main/window/config'
import { app, BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import { canAccessInferenceOperation, type InferenceOperation } from './contracts'
import { fileGrants } from './file-grants'

const observedClients = new Set<number>()

const authorizeManagedClient = (
  event: IpcMainInvokeEvent,
  acceptsWindow: (windowName: string) => boolean
): number | null => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win || !acceptsWindow(getWindowName(win))) return null
  const frame = event.senderFrame
  if (!frame || frame.top !== frame || frame.url !== event.sender.getURL()) return null
  try {
    const current = new URL(frame.url)
    const development = app.isPackaged ? undefined : process.env.ELECTRON_RENDERER_URL
    if (development) {
      const trusted = new URL(development)
      if (current.origin !== trusted.origin || current.pathname !== trusted.pathname) return null
    } else if (current.protocol !== 'file:' || !current.pathname.endsWith('/renderer/index.html')) {
      return null
    }
  } catch {
    return null
  }
  const clientId = event.sender.id
  if (!observedClients.has(clientId)) {
    observedClients.add(clientId)
    event.sender.once('destroyed', () => {
      observedClients.delete(clientId)
      fileGrants.disposeClient(clientId)
    })
  }
  return clientId
}

// Renderer 身份只由 Electron WebContents 与受管窗口配置决定，拒绝 renderer 自报身份。
export const authorizeProductClient = (event: IpcMainInvokeEvent): number | null =>
  authorizeManagedClient(event, (windowName) => windowName === 'setting')

// 全部产品能力只接受复用原系统配置界面的 setting 窗口。
export const authorizeInferenceClient = (
  event: IpcMainInvokeEvent,
  operation: InferenceOperation
): number | null =>
  authorizeManagedClient(event, (windowName) => canAccessInferenceOperation(operation, windowName))
