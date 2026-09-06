import { UPDATER_CHANNELS, UpdaterState } from '@apps/core/main/updater/type'
import { ipcRenderer } from 'electron'

export default {
  getState() {
    return ipcRenderer.invoke(UPDATER_CHANNELS.GET_STATE) as Promise<UpdaterState>
  },
  checkForUpdates() {
    return ipcRenderer.invoke(UPDATER_CHANNELS.CHECK_FOR_UPDATES) as Promise<UpdaterState>
  },
  installUpdate() {
    return ipcRenderer.invoke(UPDATER_CHANNELS.INSTALL_UPDATE) as Promise<UpdaterState>
  },
  onStateChanged(callback: (state: UpdaterState) => void) {
    const listener = (_event: Electron.IpcRendererEvent, state: UpdaterState) => {
      callback(state)
    }

    ipcRenderer.on(UPDATER_CHANNELS.STATE_CHANGED, listener)

    return () => {
      ipcRenderer.off(UPDATER_CHANNELS.STATE_CHANGED, listener)
    }
  }
}
