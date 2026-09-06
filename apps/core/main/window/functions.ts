import { createWindow, windowsList } from '@apps/core/main/window'
import window from '@config/window'
import { BrowserWindow, Display, Rectangle, screen } from 'electron'
import { getDisplayByWin, getDisplayRatio } from '../screen/helper'
import { getConfigByWindow, getConfigByWindowId } from './config'

export type WindowScreenPosition =
  | 'topLeft'
  | 'topCenter'
  | 'topRight'
  | 'centerLeft'
  | 'center'
  | 'centerRight'
  | 'bottomLeft'
  | 'bottomCenter'
  | 'bottomRight'

/**
 * 将窗口移动到屏幕的指定位置
 * @param win 目标窗口实例
 * @param index 屏幕索引，默认为 0
 * @param pos 目标位置，如 'center', 'topLeft', 'bottomRight' 等，默认为 'center'
 * @param display 指定的显示器，如果不传则自动根据 index 或窗口当前所在屏幕推断
 */
export const toScreenPosition = (
  win: BrowserWindow,
  index: number = 0,
  pos: WindowScreenPosition = 'center',
  display?: Display
) => {
  // 如果没有指定屏幕，则使用当前屏幕
  if (!display) {
    const displays = screen.getAllDisplays()
    if (index >= 0 && index < displays.length) {
      display = displays[index]
    } else {
      const winBounds = win.getBounds()
      display = screen.getDisplayMatching(winBounds)
    }
  }
  const { x, y, width, height } = display.bounds
  const [winWidth, winHeight] = win.getSize()

  const centerX = x + Math.round((width - winWidth) / 2)
  const centerY = y + Math.round((height - winHeight) / 2)
  const rightX = x + width - winWidth
  const bottomY = y + height - winHeight

  let targetX = centerX
  let targetY = centerY

  switch (pos) {
    case 'topLeft':
      targetX = x
      targetY = y
      break
    case 'topCenter':
      targetX = centerX
      targetY = y
      break
    case 'topRight':
      targetX = rightX
      targetY = y
      break
    case 'centerLeft':
      targetX = x
      targetY = centerY
      break
    case 'center':
      targetX = centerX
      targetY = centerY
      break
    case 'centerRight':
      targetX = rightX
      targetY = centerY
      break
    case 'bottomLeft':
      targetX = x
      targetY = bottomY
      break
    case 'bottomCenter':
      targetX = centerX
      targetY = bottomY
      break
    case 'bottomRight':
      targetX = rightX
      targetY = bottomY
      break
  }

  win.setBounds({
    x: targetX,
    y: targetY,
    width: winWidth,
    height: winHeight
  })
}

// 将窗口水平居中放置到屏幕顶部指定偏移处。
export const toScreenTopCenter = (
  win: BrowserWindow,
  topOffset: number,
  index: number = 0,
  display?: Display
) => {
  if (!display) {
    const displays = screen.getAllDisplays()
    if (index >= 0 && index < displays.length) {
      display = displays[index]
    } else {
      const winBounds = win.getBounds()
      display = screen.getDisplayMatching(winBounds)
    }
  }

  const { x, y, width } = display.bounds
  const [winWidth, winHeight] = win.getSize()

  win.setBounds({
    x: x + Math.round((width - winWidth) / 2),
    y: y + topOffset,
    width: winWidth,
    height: winHeight
  })
}

// 窗口置顶
export const windowToTop = (win: BrowserWindow) => {
  if (win.isMinimized()) {
    win.restore()
  }
  win.setAlwaysOnTop(true)
}

// 窗口全屏切换
export const windowToggleFullscreen = (win: BrowserWindow) => {
  const { width, height, x, y } = win.getBounds()
  const screen = getDisplayByWin(win)
  const winRatio = width / height
  const screenRatio = getDisplayRatio(screen)
  const config = getConfigByWindowId(win.id)
  if (!config) return
  config.config.isFullScreen = !config.config.isFullScreen

  // 窗口比例与屏幕比例相同时切换全屏状态
  if (winRatio >= 1 && screenRatio >= 1) {
    win.setFullScreen(config.config.isFullScreen)
    return
  }

  if (config.config.isFullScreen) {
    const ratio = screen.bounds.height / height
    const newWidth = Math.round(width * ratio)
    const newHeight = Math.round(height * ratio)
    win.setSize(newWidth, newHeight)
    toScreenPosition(win, -1, 'bottomRight', screen)
    config.config.fullScreenRestorePosition = {
      x,
      y
    }
  } else {
    const { width, height } = config.config
    win.setBounds({ width, height, ...config.config.fullScreenRestorePosition })
  }
}

// 旋转窗口90度（交换宽高）
export const windowRotate = (win: BrowserWindow) => {
  const config = getConfigByWindowId(win.id)
  if (!config || config.config.isFullScreen) return
  const { x, y, width, height } = win.getBounds()
  // 交换宽高，并计算新位置以保持窗口中心点不变
  win.setBounds({
    x: Math.round(x + (width - height) / 2),
    y: Math.round(y + (height - width) / 2),
    width: height,
    height: width
  })
  config.config.width = height
  config.config.height = width
  // 同步更新窗口的比例限制，防止后续拖拽时比例恢复
  win.setAspectRatio(height / width)
}

// 圆型窗口切换
export const windowToggleRounde = (win: BrowserWindow) => {
  const config = getConfigByWindowId(win.id)
  if (!config || config.config.isFullScreen) return
  config.config.isRounde = !config.config.isRounde
  if (config.config.isRounde) {
    win.setHasShadow(false)
    const bounds = win.getBounds()
    const size = Math.min(bounds.width, bounds.height)
    config.config.roundRestoreBounds = bounds
    win.setBounds({
      width: size,
      height: size
    })
    win.setAspectRatio(1)
  } else {
    const bounds = config.config.roundRestoreBounds as Rectangle
    win.setBounds({
      width: bounds.width,
      height: bounds.height
    })
    win.setAspectRatio(bounds.width / bounds.height)
    win.setHasShadow(true)
  }
}

// 关闭窗口
export const closeWindow = (win: BrowserWindow) => {
  win.close()
}

// 关闭多个窗口并显示指定窗口
export const closeWindows = async (showWindowNames: string[]) => {
  const windows = [...windowsList.values()]
    .filter((config) => !config.win.isDestroyed())
    .filter((config) => config.config.requiresFeatureAccess !== false)
    .filter((config) => !showWindowNames.includes(config.config.name))
    .map((config) => config.win)

  await Promise.all(
    windows.map(
      (win) =>
        new Promise<void>((resolve) => {
          win.once('closed', resolve)
          win.close()

          // 登录跳转不能被其他窗口的 close 事件拦截，否则会停留在已失效的界面。
          if (!win.isDestroyed()) {
            win.destroy()
          }
        })
    )
  )

  showWindowNames.forEach((name) => windowShow(name))
}

// 减少尺寸
export const windowReduceSize = (win: BrowserWindow) => {
  const config = getConfigByWindow(win)
  if (!config) return
  const [initialWidth, height] = win.getSize()
  let width = initialWidth
  const ratio = width / height
  const minWidth = config.config.minWidth || width
  width = Math.max(width - 30, minWidth)
  win.setBounds({
    width,
    height: Math.round(width / ratio)
  })
}

// 放大尺寸
export const windowIncreaseSize = (win: BrowserWindow) => {
  const config = getConfigByWindow(win)
  if (!config) return
  const [initialWidth, height] = win.getSize()
  let width = initialWidth
  const ratio = width / height
  const [minWidth] = win.getMinimumSize()
  width = Math.max(width + 30, minWidth)
  win.setBounds({
    width,
    height: Math.round(width / ratio)
  })
}

// 设置窗口尺寸
export const setWindowSize = (win: BrowserWindow, width: number, height: number) => {
  win.setBounds({
    width: Math.round(width),
    height: Math.round(height)
  })
}

// 获取窗口信息
export const getWindowInfo = (win: BrowserWindow) => {
  const { x, y, width, height } = win.getBounds()
  return {
    x,
    y,
    width,
    height,
    ratio: width / height
  }
}

// 刷新所有窗口
export const reloadAllWindows = (excludeName: string[]) => {
  ;[...windowsList.entries()]
    .filter(([name]) => {
      return !excludeName.includes(name)
    })
    .forEach(([, config]) => {
      const win = config.win
      if (win) win.reload()
    })
}

// 刷新窗口
export const reloadWindow = (win: BrowserWindow) => {
  win.reload()
}

// 窗口最小化切换
export const windowToggleMinimize = (win: BrowserWindow) => {
  if (win.isMinimized()) {
    win.restore()
  } else {
    win.minimize()
  }
}

// 判断窗口是否垂直
export const isVertical = (win: BrowserWindow) => {
  const { width, height } = win.getBounds()
  return width < height
}

// 显示窗口
export const windowShow = (name: string) => {
  const config = window.find((item) => item.name === name)
  if (config) {
    void createWindow({
      ...config,
      show: true
    })
  }
}

// 根据窗口 name 隐藏窗口
export const hideWindowByName = (name: string) => {
  const win = windowsList.get(name)?.win
  if (win && win.isVisible()) {
    win.hide()
    win.webContents.send('window:hide')
  }
}
