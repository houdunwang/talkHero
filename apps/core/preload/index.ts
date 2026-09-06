import { storePreload } from '@apps/core/main/store/preload'
import system from '@apps/core/main/system/preload'
import updater from '@apps/core/main/updater/preload'
import window from '@apps/core/main/window/preload'
import { contextBridge } from 'electron'

export const preload = {
  window,
  updater,
  system,
  config: storePreload('config'),
  platform: process.platform
}

contextBridge.exposeInMainWorld('core', preload)
