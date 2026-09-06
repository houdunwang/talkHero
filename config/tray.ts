import { MenuItemConstructorOptions, Tray } from 'electron'

// 系统托盘配置
export const trayConfig = [] as ((tray: Tray, menus: MenuItemConstructorOptions[]) => void)[]
