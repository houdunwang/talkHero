import { ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { getUpdaterState, handleQuitAndInstall, setUpdaterState } from '.'
import { UPDATER_CHANNELS } from './type'

export const registerUpdaterIpc = () => {
  // 检查更新
  ipcMain.handle(UPDATER_CHANNELS.CHECK_FOR_UPDATES, async () => {
    try {
      setUpdaterState({
        status: 'checking',
        message: '检查更新中...',
        downloadProgress: null,
        canInstallUpdate: false,
        lastCheckedAt: Date.now()
      })
      await autoUpdater.checkForUpdates()
    } catch {
      setUpdaterState({
        status: 'error',
        message: '检查更新失败',
        downloadProgress: null,
        canInstallUpdate: false,
        lastCheckedAt: Date.now()
      })
    }
    return getUpdaterState()
  })

  // 获取更新状态
  ipcMain.handle(UPDATER_CHANNELS.GET_STATE, () => {
    return getUpdaterState()
  })

  // 安装更新
  ipcMain.handle(UPDATER_CHANNELS.INSTALL_UPDATE, async () => {
    try {
      handleQuitAndInstall()
    } catch {
      setUpdaterState({
        status: 'error',
        message: '更新失败',
        canInstallUpdate: false,
        lastCheckedAt: Date.now()
      })
    }
    return getUpdaterState()
  })
}
