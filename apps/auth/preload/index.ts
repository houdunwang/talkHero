import { contextBridge, ipcRenderer } from 'electron'
import { AUTH_IPC } from '../types/ipc'
import type {
  AuthResult,
  AuthSnapshot,
  LoginCheck,
  LoginQr,
  PaymentCheck,
  PaymentQr,
  PaymentState,
  PurchaseOptions,
  SubscriptionPeriod
} from '../types/public'

export const preload = {
  getSnapshot: () => ipcRenderer.invoke(AUTH_IPC.snapshot) as Promise<AuthResult<AuthSnapshot>>,
  logout: () => ipcRenderer.invoke(AUTH_IPC.logout) as Promise<AuthResult<AuthSnapshot>>,
  createLoginQr: () => ipcRenderer.invoke(AUTH_IPC.loginCreate) as Promise<AuthResult<LoginQr>>,
  checkLogin: () => ipcRenderer.invoke(AUTH_IPC.loginCheck) as Promise<AuthResult<LoginCheck>>,
  cancelLogin: () => ipcRenderer.invoke(AUTH_IPC.loginCancel) as Promise<AuthResult<boolean>>,
  getPurchaseOptions: () =>
    ipcRenderer.invoke(AUTH_IPC.purchaseOptions) as Promise<AuthResult<PurchaseOptions>>,
  getPaymentState: () =>
    ipcRenderer.invoke(AUTH_IPC.paymentState) as Promise<AuthResult<PaymentState>>,
  createPayment: (period: SubscriptionPeriod) =>
    ipcRenderer.invoke(AUTH_IPC.paymentCreate, period) as Promise<AuthResult<PaymentQr>>,
  checkPayment: () =>
    ipcRenderer.invoke(AUTH_IPC.paymentCheck) as Promise<AuthResult<PaymentCheck>>,
  syncPayment: () => ipcRenderer.invoke(AUTH_IPC.paymentSync) as Promise<AuthResult<PaymentCheck>>,
  cancelPayment: () => ipcRenderer.invoke(AUTH_IPC.paymentCancel) as Promise<AuthResult<boolean>>,
  onSnapshotChanged: (callback: (snapshot: AuthSnapshot) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, snapshot: AuthSnapshot): void =>
      callback(snapshot)
    ipcRenderer.on(AUTH_IPC.snapshotChanged, listener)
    return () => {
      ipcRenderer.removeListener(AUTH_IPC.snapshotChanged, listener)
    }
  }
}

contextBridge.exposeInMainWorld('auth', preload)
