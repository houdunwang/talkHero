import { app, BrowserWindow } from 'electron'
import { appConfig, configStore } from '../config'
import { windowShow } from '../window/functions'
import { dockConfig } from '@config/dock'

app.whenReady().then(async () => {
  if (process.platform === 'darwin') {
    if (appConfig.hideDockIcon) app.dock?.hide()
    else await app.dock?.show()
  }

  configStore.onDidChange('hideDockIcon', (state) => {
    if (process.platform === 'darwin') {
      if (state) app.dock?.hide()
      else void app.dock?.show()
    }
  })

  // 监听配置变化
  configStore.onDidChange('hideDockIcon', () => {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.setSkipTaskbar(appConfig.hideDockIcon)
    })
  })

  // 没有可见窗口时，通过 Dock 激活应用会打开设置窗口。
  app.on('activate', (_event, hasVisibleWindows) => {
    if (hasVisibleWindows) return
    windowShow(dockConfig.windowName)
  })
})
