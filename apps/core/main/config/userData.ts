import { app } from 'electron'
import { join } from 'node:path'

export const setupUserDataPath = () => {
  // 开发环境将数据写入项目目录，避免污染正式版数据并规避受限环境下的系统目录权限问题。
  if (!app.isPackaged) {
    app.setPath('userData', join(process.cwd(), '.electron', 'userData'))
  }
}
