import { atom, useAtom } from 'jotai'
import { useMemo } from 'react'

const fullscreenAtom = atom(false)
const rotateAtom = atom(Number(sessionStorage.getItem('windowRotate')) || 0)
const roundAtom = atom(false)

export const useWindow = () => {
  const [isFullscreen, setIsFullscreen] = useAtom(fullscreenAtom)
  const [rotate, setRotate] = useAtom(rotateAtom)
  const [rounded, setRounded] = useAtom(roundAtom)

  // 显示窗口，窗口必须已经创建过
  const windowShow = (name: string) => {
    window.core.window.windowShow(name)
  }

  // 切换窗口全屏
  const toggleFullscreen = () => {
    window.core.window.windowToggleFullscreen()
    setIsFullscreen(!isFullscreen)
  }

  // 切换窗口圆角
  const windowRound = async () => {
    const isFullScreen = await window.core.window.isFullScreen()
    if (isFullScreen) return
    window.core.window.windowToggleRounde()
    setRounded(!rounded)
  }

  // 判断窗口是否垂直
  const isVertical = useMemo(() => (rotate / 90) % 2 !== 0, [rotate])

  // 旋转窗口
  const windowRotate = async () => {
    const isFullScreen = await window.core.window.isFullScreen()
    if (isFullScreen) return
    window.core.window.windowRotate()
    setRotate((prev) => {
      const nextRotate = prev + 90 === 360 ? 0 : prev + 90
      sessionStorage.setItem('windowRotate', String(nextRotate))
      return nextRotate
    })
  }

  // 关闭窗口
  const closeWindow = () => {
    window.core.window.closeWindow()
  }

  // 设置窗口尺寸
  const setWindowSize = (width: number, height: number, name?: string) =>
    window.core.window.setWindowSize(width, height, name)

  // 获取当前窗口名称
  const getWindowName = () => window.core.window.getWindowName()

  // 获取窗口信息
  const getWindowInfo = (name?: string) => window.core.window.getWindowInfo(name)

  // 开启/关闭控制台
  const toggleDevTools = () => {
    window.core.window.toggleDevTools()
  }

  return {
    closeWindow,
    rotate,
    isVertical,
    windowRotate,
    windowRound,
    toggleFullscreen,
    isFullscreen,
    windowShow,
    rounded,
    setRounded,
    setWindowSize,
    getWindowName,
    getWindowInfo,
    toggleDevTools
  }
}
