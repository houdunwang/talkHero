import { BrowserWindow, Display, screen } from 'electron'

// 获取窗口所在显示器
export const getDisplayByWin = (win: BrowserWindow) => {
  const winBounds = win.getBounds()
  return screen.getDisplayMatching(winBounds)
}

// 获取鼠标当前所在显示器，适合启动器这类需要跟随当前工作屏幕的窗口。
export const getDisplayByCursor = () => {
  return screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
}

// 获取显示器比例
export const getDisplayRatio = (display: Display) => {
  const { width, height } = display.bounds
  const ratio = (width / height).toFixed(2) // 保留2位小数
  return parseFloat(ratio)
}
