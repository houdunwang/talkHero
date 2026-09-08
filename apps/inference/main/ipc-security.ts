import { getWindowName } from '@apps/core/main/window/config'
import { app, BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import { fileGrants } from './file-grants'

const observedClients = new Set<number>()

// Renderer 身份只由 Electron WebContents 与受管窗口配置决定，拒绝 renderer 自报身份。
export const authorizeTalkHeroClient = (event: IpcMainInvokeEvent): number | null => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win || getWindowName(win) !== 'talkHero') return null
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
