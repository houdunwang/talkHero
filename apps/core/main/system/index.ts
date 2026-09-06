import { electronApp, optimizer } from '@electron-toolkit/utils'
import { app } from 'electron'
import systemBoot from '../boot'
import '../config'
import '../dock'
import '../request'
import '../tray'
import './ipc'
import { startup } from './startup'

const isFirstInstance = app.requestSingleInstanceLock()

if (!isFirstInstance) {
  app.quit()
} else {
  app
    .whenReady()
    .then(async () => {
      electronApp.setAppUserModelId('com.houdunyun.ruyi')

      app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
      })

      await systemBoot()
      void startup()
    })
    .catch((error) => {
      console.error('Failed to start application', error)
      app.exit()
    })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // app.quit()
  }
})
