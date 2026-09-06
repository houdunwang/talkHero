import { SECRET_IPC } from '@apps/secret/config/defaults'
import type { BindLicenseResult } from '@apps/secret/main/helper'
import { contextBridge, ipcRenderer } from 'electron'

export const preload = {
  bindLicense(secret: string) {
    return ipcRenderer.invoke(SECRET_IPC.bindLicense, secret) as Promise<
      BindLicenseResult | undefined
    >
  }
}

contextBridge.exposeInMainWorld('secret', preload)

export default preload
