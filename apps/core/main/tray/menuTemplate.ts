import type { MenuItemConstructorOptions } from 'electron'

type SystemTrayMenuActions = {
  openSettings: () => void
  restart: () => void
  quit: () => void
}

export const createSystemTrayMenus = (
  actions: SystemTrayMenuActions
): MenuItemConstructorOptions[] => [
  {
    label: '软件配置',
    click: async () => actions.openSettings()
  },
  {
    label: '重启软件',
    click: actions.restart
  },
  {
    label: '退出程序',
    click: actions.quit
  }
]

// 组合功能菜单与系统操作菜单，并固定二者之间的语义分组边界。
export const joinTrayMenuGroups = (
  featureMenus: MenuItemConstructorOptions[],
  systemMenus: MenuItemConstructorOptions[]
): MenuItemConstructorOptions[] => [...featureMenus, { type: 'separator' }, ...systemMenus]
