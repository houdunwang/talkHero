import { restartApp } from '@apps/core/main/system/functions'
import { is } from '@electron-toolkit/utils'
import { trayConfig } from '@config/tray'
import type { MenuItemConstructorOptions } from 'electron'
import { app, Menu, Tray } from 'electron'
import { title as productName } from '../../../../package.json'
import './icon'
import { createTrayIcon } from './icon'
import { createSystemTrayMenus, joinTrayMenuGroups } from './menuTemplate'
import { windowShow } from '../window/functions'

const menus: MenuItemConstructorOptions[] = []
let tray: Tray | null = null
let statusTitle = ''

const getTrayTitle = () => {
  const developmentTitle = is.dev ? productName : ''
  return [developmentTitle, statusTitle].filter(Boolean).join(' · ')
}

const applyTrayTitle = (targetTray: Tray) => {
  const title = getTrayTitle()
  if (process.platform === 'darwin') {
    targetTray.setTitle(title)
  } else {
    targetTray.setToolTip(title || productName)
  }
}

const systemMenus: MenuItemConstructorOptions[] = createSystemTrayMenus({
  openSettings: () => windowShow('setting'),
  restart: restartApp,
  quit: () => app.quit()
})

const configureTray = (targetTray: Tray) => {
  targetTray.removeAllListeners('click')
  targetTray.removeAllListeners('right-click')
  menus.length = 0
  trayConfig.forEach((config) => config(targetTray, menus))

  const menu = Menu.buildFromTemplate(joinTrayMenuGroups(menus, systemMenus))
  targetTray.setContextMenu(menu)
  targetTray.setImage(createTrayIcon())
  targetTray.setToolTip(productName)
  applyTrayTitle(targetTray)
}

export const ensureTray = () => {
  if (!app.isReady()) return null

  if (!tray || tray.isDestroyed()) {
    tray = new Tray(createTrayIcon())
  }

  configureTray(tray)
  return tray
}

app
  .whenReady()
  .then(() => {
    ensureTray()
  })
  .catch((error) => {
    console.error('[tray] Failed to initialize tray', error)
  })

// 刷新托盘：重建 menus 并更新托盘上下文菜单与图标
export const refreshTray = () => {
  ensureTray()
}

// 设置 tray 标题（macOS 菜单栏文字，Windows/Linux 为 tooltip）
export const setTrayTitle = (title: string) => {
  statusTitle = title
  if (tray) applyTrayTitle(tray)
}
