import { WindowBaseConfig } from '@apps/core/types/window'
import windows from '@config/window'
import { BrowserWindow } from 'electron'
import { appConfig } from '../config'
import { createBrowserWindow } from './createWindow'
import './ipc'
import { closeWindows } from './functions'

// 窗口列表
export const windowsList = new Map<string, { config: WindowBaseConfig; win: BrowserWindow }>()

const accessWindowName = (status: 'logged-out' | 'inactive') => {
  return status === 'logged-out' ? 'login' : 'pay'
}

const showWebsiteAccessWindow = async (status: 'logged-out' | 'inactive') => {
  await closeWindows([accessWindowName(status)])
}

// 校验功能访问权限：默认从内存读取本地授权，启动流程可传入 true 触发官网刷新。
export const ensureMainFeatureAccess = async (refreshWebsiteAccess = false) => {
  const { getWebsiteAccessStatus } = await import('@apps/auth/main/service')
  const status = await getWebsiteAccessStatus(refreshWebsiteAccess)
  if (status === 'active') return true

  await showWebsiteAccessWindow(status)
  return false
}

// 初始化窗口
export const initWindow = async () => {
  const websiteAccessStatus = await (
    await import('@apps/auth/main/service')
  ).getWebsiteAccessStatus(true)

  if (appConfig.silentStart) return

  if (websiteAccessStatus !== 'active') {
    await showWebsiteAccessWindow(websiteAccessStatus)
    return
  }

  for (const config of windows) {
    if (config.createOnStartup === true) {
      await createWindow(config)
    }
  }
}

// 创建窗口
export async function createWindow(config: WindowBaseConfig) {
  if (
    config.name !== 'login' &&
    config.name !== 'pay' &&
    config.requiresFeatureAccess !== false &&
    !(await ensureMainFeatureAccess())
  ) {
    return
  }

  const existing = windowsList.get(config.name)?.win
  if (existing && !existing.isDestroyed()) {
    if (config.show) {
      if (existing.isMinimized()) existing.restore()
      existing.show()
      existing.focus()
      existing.webContents.send('window:show')
    }
    return existing
  }

  return createBrowserWindow(config)
}
