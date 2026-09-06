// Auth IPC 是 renderer 与主进程认证/支付状态机之间唯一的公共边界。
import { getWindowName } from '@apps/core/main/window/config'
import { windowsList } from '@apps/core/main/window'
import { closeWindows } from '@apps/core/main/window/functions'
import { BrowserWindow, ipcMain, type IpcMainInvokeEvent, type WebContents } from 'electron'
import type { AuthFailure, AuthResult, AuthSnapshot } from '../types/public'
import { AUTH_IPC } from '../types/ipc'
import { canInvokeAuthOperation, parseSubscriptionPeriod, type AuthOperation } from './contracts'
import { authFlow } from './service'

const observedClients = new Set<number>()

const forbidden = (message = '当前窗口无权执行此操作'): AuthFailure => ({
  ok: false,
  code: 'forbidden',
  message
})

const invalidInput = (): AuthFailure => ({
  ok: false,
  code: 'invalid-input',
  message: '请求参数无效'
})

const getAuthorizedClient = (
  event: IpcMainInvokeEvent,
  operation: AuthOperation
): { clientId: number; sender: WebContents } | null => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const windowName = win ? getWindowName(win) : ''
  if (!canInvokeAuthOperation(operation, windowName)) return null

  const clientId = event.sender.id
  if (!observedClients.has(clientId)) {
    observedClients.add(clientId)
    event.sender.once('destroyed', () => {
      observedClients.delete(clientId)
      authFlow.disposeClient(clientId)
    })
  }
  return { clientId, sender: event.sender }
}

const broadcastSnapshot = (snapshot: AuthSnapshot): void => {
  windowsList.forEach(({ win }) => {
    if (!win.isDestroyed()) win.webContents.send(AUTH_IPC.snapshotChanged, snapshot)
  })
}

const registerNoArgumentHandler = <T>(
  channel: string,
  operation: AuthOperation,
  handler: (clientId: number) => Promise<AuthResult<T>> | AuthResult<T>
): void => {
  ipcMain.removeHandler(channel)
  ipcMain.handle(channel, async (event, ...args: unknown[]) => {
    const client = getAuthorizedClient(event, operation)
    if (!client) return forbidden()
    if (args.length !== 0) return invalidInput()
    return handler(client.clientId)
  })
}

registerNoArgumentHandler(AUTH_IPC.snapshot, 'snapshot', () => ({
  ok: true,
  data: authFlow.getSnapshot()
}))
registerNoArgumentHandler(AUTH_IPC.logout, 'logout', async () => {
  const result = await authFlow.logout()
  if (result.ok) {
    broadcastSnapshot(result.data)
    await closeWindows(['login'])
  }
  return result
})
registerNoArgumentHandler(AUTH_IPC.loginCreate, 'login:create', (clientId) =>
  authFlow.createLoginQr(clientId)
)
registerNoArgumentHandler(AUTH_IPC.loginCheck, 'login:check', async (clientId) => {
  const result = await authFlow.checkLogin(clientId)
  if (result.ok && result.data.status === 'authenticated') broadcastSnapshot(result.data.snapshot)
  return result
})
registerNoArgumentHandler(AUTH_IPC.loginCancel, 'login:cancel', (clientId) => {
  authFlow.cancelLogin(clientId)
  return { ok: true, data: true }
})
registerNoArgumentHandler(AUTH_IPC.purchaseOptions, 'purchase:options', (clientId) =>
  authFlow.getPurchaseOptions(clientId)
)
registerNoArgumentHandler(AUTH_IPC.paymentState, 'payment:state', () => ({
  ok: true,
  data: authFlow.getPaymentState()
}))
registerNoArgumentHandler(AUTH_IPC.paymentCheck, 'payment:check', async (clientId) => {
  const result = await authFlow.checkPayment(clientId)
  if (result.ok && result.data.status === 'active') broadcastSnapshot(result.data.snapshot)
  return result
})
registerNoArgumentHandler(AUTH_IPC.paymentSync, 'payment:sync', async (clientId) => {
  const result = await authFlow.syncPayment(clientId)
  if (result.ok && result.data.status === 'active') broadcastSnapshot(result.data.snapshot)
  return result
})
registerNoArgumentHandler(AUTH_IPC.paymentCancel, 'payment:cancel', (clientId) => {
  authFlow.cancelPayment(clientId)
  return { ok: true, data: true }
})

ipcMain.removeHandler(AUTH_IPC.paymentCreate)
ipcMain.handle(AUTH_IPC.paymentCreate, (event, ...args: unknown[]) => {
  const client = getAuthorizedClient(event, 'payment:create')
  if (!client) return forbidden()
  if (args.length !== 1) return invalidInput()
  const period = parseSubscriptionPeriod(args[0])
  return period ? authFlow.createPayment(client.clientId, period) : invalidInput()
})
