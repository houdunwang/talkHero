import { BrowserWindow } from 'electron'
import { windowsList } from './'

/**
 * 根据窗口名称获取窗口配置
 * @param name 窗口名称
 * @returns 窗口配置对象或 undefined
 */
export const getConfigByWindowName = (name: string) => {
  return windowsList.get(name)
}

/**
 * 根据窗口 ID 获取窗口配置
 * @param id 窗口 ID (BrowserWindow.id)
 * @returns 窗口配置对象或 undefined
 */
export const getConfigByWindowId = (id: number) => {
  return [...windowsList.values()].find((item) => item.win?.id == id)
}

/**
 * 根据 BrowserWindow 实例获取窗口配置
 * @param win BrowserWindow 实例
 * @returns 窗口配置对象或 undefined
 */
export const getConfigByWindow = (win: BrowserWindow) => {
  return [...windowsList.values()].find((item) => item.win === win)
}

/**
 * 根据 BrowserWindow 实例获取窗口名称
 * @param win BrowserWindow 实例
 * @returns 窗口名称，如果未找到则返回空字符串
 */
export const getWindowName = (win: BrowserWindow) => {
  const config = getConfigByWindow(win)
  if (!config) return ''
  return config.config.name
}
