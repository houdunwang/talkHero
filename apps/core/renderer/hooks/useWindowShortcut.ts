import { useKeyPress } from 'ahooks'
import { useWindow } from './useWindow'
import { useSetting } from './useSetting'

const isWindowFocused = () => document.hasFocus()

export const useWindowShortcut = () => {
  const { toggleFullscreen, windowRotate, windowRound, closeWindow, toggleDevTools } = useWindow()
  const { openSettingWindow } = useSetting()

  const windowKeyHandler = (handler: () => void) => {
    return () => {
      if (!isWindowFocused()) return
      handler()
    }
  }

  useKeyPress(
    '1',
    windowKeyHandler(() => window.core.window.toScreenPosition(-1, 'topLeft'))
  )
  useKeyPress(
    '2',
    windowKeyHandler(() => window.core.window.toScreenPosition(-1, 'topCenter'))
  )
  useKeyPress(
    '3',
    windowKeyHandler(() => window.core.window.toScreenPosition(-1, 'topRight'))
  )
  useKeyPress(
    '4',
    windowKeyHandler(() => window.core.window.toScreenPosition(-1, 'centerLeft'))
  )
  useKeyPress(
    '5',
    windowKeyHandler(() => window.core.window.toScreenPosition(-1, 'center'))
  )
  useKeyPress(
    '6',
    windowKeyHandler(() => window.core.window.toScreenPosition(-1, 'centerRight'))
  )
  useKeyPress(
    '7',
    windowKeyHandler(() => window.core.window.toScreenPosition(-1, 'bottomLeft'))
  )
  useKeyPress(
    '8',
    windowKeyHandler(() => window.core.window.toScreenPosition(-1, 'bottomCenter'))
  )
  useKeyPress(
    '9',
    windowKeyHandler(() => window.core.window.toScreenPosition(-1, 'bottomRight'))
  )
  useKeyPress(
    'ArrowLeft',
    windowKeyHandler(() => window.core.window.toScreenPosition(-1, 'bottomLeft'))
  )
  useKeyPress(
    'ArrowRight',
    windowKeyHandler(() => window.core.window.toScreenPosition(-1, 'bottomRight'))
  )
  useKeyPress(
    'ArrowUp',
    windowKeyHandler(async () => {
      const isFullScreen = await window.core.window.isFullScreen()
      if (isFullScreen) return
      window.core.window.windowIncreaseSize()
    })
  )
  useKeyPress(
    'ArrowDown',
    windowKeyHandler(async () => {
      const isFullScreen = await window.core.window.isFullScreen()
      if (isFullScreen) return
      window.core.window.windowReduceSize()
    })
  )
  useKeyPress('comma', windowKeyHandler(openSettingWindow))
  useKeyPress(
    'c',
    windowKeyHandler(() => window.core.window.toScreenPosition(-1, 'center'))
  )
  useKeyPress('f', windowKeyHandler(toggleFullscreen))
  useKeyPress('q', windowKeyHandler(closeWindow))
  useKeyPress('r', windowKeyHandler(windowRotate))
  useKeyPress('ctrl.alt.i', windowKeyHandler(toggleDevTools), { exactMatch: true })
  useKeyPress('e', windowKeyHandler(windowRound))
}
