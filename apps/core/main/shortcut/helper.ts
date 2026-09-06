import { globalShortcut } from 'electron'

const GLOBAL_SHORTCUT_FAILURE_MESSAGE = '快捷键注册失败，可能与系统或其他软件冲突'

type GlobalShortcutRegisterResult = {
  accelerator: string
  registered: boolean
  message: string
}

export const unregisterGlobalShortcut = (accelerator: string): void => {
  if (!accelerator.trim()) return
  globalShortcut.unregister(accelerator)
}

export const registerGlobalShortcut = (
  accelerator: string,
  callback: () => void
): GlobalShortcutRegisterResult => {
  try {
    const registered = globalShortcut.register(accelerator, callback)

    return {
      accelerator,
      registered,
      message: registered ? `当前快捷键：${accelerator}` : GLOBAL_SHORTCUT_FAILURE_MESSAGE
    }
  } catch (error) {
    console.error('Failed to register global shortcut:', accelerator, error)
    return {
      accelerator,
      registered: false,
      message: GLOBAL_SHORTCUT_FAILURE_MESSAGE
    }
  }
}
