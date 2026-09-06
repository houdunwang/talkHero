import { type WindowScreenPosition } from '@apps/core/main/window/functions'
import { ipcRenderer } from 'electron'

export default {
  windowToTop() {
    ipcRenderer.send('windowToTop')
  },
  windowToggleFullscreen() {
    ipcRenderer.send('windowToggleFullscreen')
  },
  windowRotate() {
    ipcRenderer.send('windowRotate')
  },

  closeWindow() {
    ipcRenderer.send('closeWindow')
  },
  // 关闭多个窗口并显示指定窗口
  closeWindows(showWindowNames: string[]) {
    ipcRenderer.send('closeWindows', showWindowNames)
  },
  // 圆型窗口切换
  windowToggleRounde() {
    ipcRenderer.send('windowToggleRounde')
  },
  // 设置窗口位置
  toScreenPosition(index: number, pos: WindowScreenPosition) {
    ipcRenderer.send('toScreenPosition', index, pos)
  },
  // 减少尺寸
  windowReduceSize() {
    ipcRenderer.send('windowReduceSize')
  },
  // 放大尺寸
  windowIncreaseSize() {
    ipcRenderer.send('windowIncreaseSize')
  },
  // 刷新所有窗口
  reloadAllWindows(excludeWindowNames: string[] = []) {
    ipcRenderer.send('reloadAllWindows', excludeWindowNames)
  },
  // 刷新当前窗口
  reloadCurrentWindow() {
    ipcRenderer.send('reloadCurrentWindow')
  },
  // 显示窗口
  windowShow(name: string) {
    ipcRenderer.send('windowShow', name)
  },
  // 设置窗口尺寸
  setWindowSize(width: number, height: number, winName?: string): Promise<boolean> {
    return ipcRenderer.invoke('setWindowSize', width, height, winName)
  },
  // 获取当前窗口名称
  getWindowName(): Promise<string> {
    return ipcRenderer.invoke('getWindowName')
  },
  // 获取窗口信息
  getWindowInfo(
    name?: string
  ): Promise<{ x: number; y: number; width: number; height: number; ratio: number } | null> {
    return ipcRenderer.invoke('getWindowInfo', name)
  },
  // 窗口最小化
  windowToggleMinimize() {
    ipcRenderer.send('windowToggleMinimize')
  },
  // 开启/关闭控制台
  toggleDevTools() {
    ipcRenderer.send('toggleDevTools')
  },
  // 判断窗口是否为圆角
  isRounde(): Promise<boolean> {
    return ipcRenderer.invoke('isRounde')
  },
  // 判断窗口是否为全屏窗口
  isFullScreen(): Promise<boolean> {
    return ipcRenderer.invoke('isFullScreen')
  },
  // 隐藏窗口调用 (主进程调用)
  windowHide(callback: () => void) {
    const listener = () => {
      callback()
    }
    ipcRenderer.on('window:hidden', listener)
    return () => {
      ipcRenderer.off('window:hidden', listener)
    }
  },
  // 窗口显示调用 (主进程调用)
  windowShown(callback: () => void) {
    const listener = () => {
      callback()
    }
    ipcRenderer.on('window:show', listener)
    return () => {
      ipcRenderer.off('window:show', listener)
    }
  }
}
