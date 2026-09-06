import { is } from '@electron-toolkit/utils'
import { app } from 'electron'

// 重启软件
export const restartApp = () => {
  if (is.dev) return

  app.relaunch({
    execPath: process.execPath,
    args: process.argv.slice(1)
  })
  app.quit()
}
