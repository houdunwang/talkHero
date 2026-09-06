import { WindowBaseConfig } from '@apps/core/types/window'
import { is } from '@electron-toolkit/utils'
import { BrowserWindow } from 'electron'
import { join } from 'path'
import icon from '../../../../build/icon.png?asset'
import { windowsList } from './'
import { openSafeExternalUrl } from '../externalUrl'

export function createBrowserWindow(options: WindowBaseConfig): BrowserWindow {
  const { route = '/', ...browserWindowOptions } = options
  const win = new BrowserWindow({
    autoHideMenuBar: true,
    icon,
    ...browserWindowOptions,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      backgroundThrottling: browserWindowOptions.webPreferences?.backgroundThrottling,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false,
    // 隐藏任务栏图标
    skipTaskbar: options.hideDockIcon
  })

  win.on('ready-to-show', () => {
    if (options.show) {
      if (options.beforeShow) options.beforeShow(win)
      win.show()
    }
  })

  win.on('hide', () => {
    win.webContents.send('window:hidden')
  })

  win.on('show', () => {
    win.webContents.send('window:show')
  })

  win.on('closed', () => {
    windowsList.delete(options.name)
  })

  windowsList.set(options.name, { config: options, win })

  win.webContents.setWindowOpenHandler((details) => {
    openSafeExternalUrl(details.url).catch((error) => {
      // 外链打开失败仅记录脱敏错误，保持当前窗口可用，不影响页面与输入
      console.error('Failed to open external url:', error)
    })
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    const rendererUrl = new URL(process.env['ELECTRON_RENDERER_URL'])
    rendererUrl.hash = normalizeRoute(route)
    win.loadURL(rendererUrl.toString())
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: normalizeRoute(route)
    })
  }
  return win
}

function normalizeRoute(route: string): string {
  if (!route) return '/'
  return route.startsWith('/') ? route : `/${route}`
}
