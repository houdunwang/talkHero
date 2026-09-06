import { BrowserWindow, BrowserWindowConstructorOptions, Rectangle } from 'electron'

export interface WindowBaseConfig extends BrowserWindowConstructorOptions {
  name: string
  route?: string
  // 只有 true 才会随应用启动创建，否则由 windowShow/createWindow 按需创建。
  createOnStartup?: boolean
  requiresFeatureAccess?: boolean
  isFullScreen?: boolean
  isRounde?: boolean
  hideDockIcon?: boolean
  fullScreenRestorePosition?: Pick<Rectangle, 'x' | 'y'>
  roundRestoreBounds?: Rectangle
  beforeShow?: (win: BrowserWindow) => void
}
