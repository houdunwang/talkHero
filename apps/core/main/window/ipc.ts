import { BrowserWindow, ipcMain } from 'electron'
import windowConfigs from '@config/window'
import { getConfigByWindowId, getWindowName } from './config'
import { windowsList } from './'
import {
  closeWindow,
  closeWindows,
  getWindowInfo,
  isVertical,
  reloadAllWindows,
  reloadWindow,
  setWindowSize,
  toScreenPosition,
  windowIncreaseSize,
  windowReduceSize,
  windowRotate,
  windowShow,
  windowToggleFullscreen,
  windowToggleMinimize,
  windowToggleRounde,
  windowToTop
} from './functions'

const configuredWindowNames = new Set(windowConfigs.map(({ name }) => name))

const isConfiguredWindowName = (value: unknown): value is string =>
  typeof value === 'string' && configuredWindowNames.has(value)

/**
 * 置顶窗口
 */
ipcMain.on('windowToTop', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win && windowToTop(win)
})

/**
 * 切换窗口全屏状态
 */
ipcMain.on('windowToggleFullscreen', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win && windowToggleFullscreen(win)
})

/**
 * 旋转窗口
 */
ipcMain.on('windowRotate', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win && windowRotate(win)
})

/**
 * 关闭窗口
 */
ipcMain.on('closeWindow', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win && closeWindow(win)
})

ipcMain.on('closeWindows', async (_event, showWindowNames: unknown) => {
  if (
    !Array.isArray(showWindowNames) ||
    showWindowNames.length > configuredWindowNames.size ||
    !showWindowNames.every(isConfiguredWindowName)
  ) {
    return
  }

  await closeWindows(showWindowNames)
})

/**
 * 移动窗口到指定屏幕位置
 */
ipcMain.on('toScreenPosition', (event, index, pos) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win && toScreenPosition(win, index, pos)
})

/**
 * 减小窗口尺寸
 */
ipcMain.on('windowReduceSize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win && windowReduceSize(win)
})

/**
 * 增大窗口尺寸
 */
ipcMain.on('windowIncreaseSize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win && windowIncreaseSize(win)
})

/**
 * 切换窗口圆角状态
 */
ipcMain.on('windowToggleRounde', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win && windowToggleRounde(win)
})

/**
 * 重新加载所有窗口
 */
ipcMain.on('reloadAllWindows', (_event, exclude = []) => {
  reloadAllWindows(exclude)
})

ipcMain.on('reloadCurrentWindow', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) reloadWindow(win)
})

/**
 * 显示指定名称的窗口
 */
ipcMain.on('windowShow', (_event, name: unknown) => {
  if (!isConfiguredWindowName(name)) return
  windowShow(name)
})

/**
 * 设置窗口尺寸
 */
ipcMain.handle('setWindowSize', (event, width, height, name) => {
  const win = name ? windowsList.get(name)?.win : BrowserWindow.fromWebContents(event.sender)
  if (win) {
    setWindowSize(win, width, height)
    return true
  }
  return false
})

/**
 * 获取当前窗口名称
 */
ipcMain.handle('getWindowName', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  return win ? getWindowName(win) : ''
})

/**
 * 获取窗口信息
 */
ipcMain.handle('getWindowInfo', (event, name?: string) => {
  let win: BrowserWindow | undefined
  if (name) {
    win = windowsList.get(name)?.win || undefined
  } else {
    win = BrowserWindow.fromWebContents(event.sender) || undefined
  }
  return win ? getWindowInfo(win) : null
})

/**
 * 切换窗口最小化状态
 */
ipcMain.on('windowToggleMinimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win && windowToggleMinimize(win)
})

/**
 * 切换开发者工具显示状态
 */
ipcMain.on('toggleDevTools', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    if (win.webContents.isDevToolsOpened()) {
      win.webContents.closeDevTools()
    } else {
      win.webContents.openDevTools()
    }
  }
})

/**
 * 判断窗口是否为圆角
 */
ipcMain.handle('isRounde', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return false
  const config = getConfigByWindowId(win.id)
  return config?.config.isRounde || false
})

// 窗口是否全屏
ipcMain.handle('isFullScreen', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return false
  const config = getConfigByWindowId(win.id)
  return config?.config.isFullScreen || false
})

// 是否是垂直窗口
ipcMain.handle('isVertical', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return false
  return isVertical(win)
})
