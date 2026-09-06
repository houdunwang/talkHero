import { app } from 'electron'
import { configStore } from '../config'

// 开机启动
export const startup = async () => {
  const setAutoStart = () => {
    if (!app.isPackaged) return

    const autoStart = configStore.get('autoStart') as boolean
    const silentStart = configStore.get('silentStart') as boolean

    app.setLoginItemSettings({
      openAtLogin: autoStart,
      // path: app.getPath('exe'),
      openAsHidden: silentStart
    })
  }

  // 初始化设置
  setAutoStart()

  // 监听配置变化
  configStore.onDidChange('autoStart', () => {
    setAutoStart()
  })

  configStore.onDidChange('silentStart', () => {
    setAutoStart()
  })
}
