import { toScreenPosition } from '@apps/core/main/window/functions'
import { WindowBaseConfig } from '@apps/core/types/window'
import { app } from 'electron'

const isDev = !app.isPackaged

export default [
  {
    name: 'talkHero',
    width: 1280,
    height: 820,
    minWidth: 1080,
    minHeight: 720,
    title: 'TalkHero',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#00000000', symbolColor: '#e4e4e7', height: 40 },
    route: '/video/workbench',
    resizable: true,
    hasShadow: true,
    hideDockIcon: false,
    createOnStartup: true,
    show: true,
    beforeShow: (win) => {
      if (isDev) toScreenPosition(win, 0, 'center')
    }
  },
  {
    name: 'setting',
    width: 1140,
    height: 760,
    minWidth: 1140,
    minHeight: 760,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#00000000', symbolColor: '#3f3f46', height: 32 },
    route: '/core/config',
    resizable: true,
    hasShadow: true,
    hideDockIcon: false,
    show: isDev,
    beforeShow: (win) => {
      if (isDev) toScreenPosition(win, 0, 'center')
    }
  },
  {
    name: 'login',
    width: 750,
    height: 600,
    minWidth: 750,
    minHeight: 600,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#00000000', symbolColor: '#3f3f46', height: 32 },
    route: '/auth/wechatLogin',
    resizable: false,
    hasShadow: true,
    hideDockIcon: false,
    show: false,
    beforeShow: (win) => {
      if (isDev) toScreenPosition(win, 0, 'center')
    }
  },
  {
    name: 'pay',
    width: 850,
    height: 700,
    minWidth: 850,
    minHeight: 700,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#00000000', symbolColor: '#3f3f46', height: 32 },
    route: '/auth/pay',
    resizable: false,
    hasShadow: true,
    show: false,
    beforeShow: (win) => {
      if (isDev) toScreenPosition(win, 0, 'center')
    }
  }
] as WindowBaseConfig[]
