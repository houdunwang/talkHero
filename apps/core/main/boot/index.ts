import { initUpdater } from '../updater'
import { initWindow } from '../window'

export default async () => {
  // 初始化窗口
  await initWindow()

  // 初始化更新
  initUpdater()
}
