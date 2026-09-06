import { describe, expect, it, vi } from 'vitest'

const globalShortcut = vi.hoisted(() => ({
  isRegistered: vi.fn(),
  register: vi.fn(),
  unregister: vi.fn()
}))

vi.mock('electron', () => ({ globalShortcut }))

import { registerGlobalShortcut, unregisterGlobalShortcut } from './helper'

describe('registerGlobalShortcut', () => {
  it('以本次注册的成功结果记录快捷键所有权', () => {
    globalShortcut.register.mockReturnValue(true)
    globalShortcut.isRegistered.mockReturnValue(false)

    expect(registerGlobalShortcut('Alt+E', vi.fn())).toEqual({
      accelerator: 'Alt+E',
      registered: true,
      message: '当前快捷键：Alt+E'
    })
    expect(globalShortcut.register).toHaveBeenCalledWith('Alt+E', expect.any(Function))
    expect(globalShortcut.isRegistered).not.toHaveBeenCalled()
  })

  it('不把其他模块已注册的快捷键误记为本次注册成功', () => {
    globalShortcut.register.mockReturnValue(false)
    globalShortcut.isRegistered.mockReturnValue(true)

    expect(registerGlobalShortcut('Alt+E', vi.fn())).toEqual({
      accelerator: 'Alt+E',
      registered: false,
      message: '快捷键注册失败，可能与系统或其他软件冲突'
    })
  })

  it('只在 accelerator 非空时注销快捷键', () => {
    unregisterGlobalShortcut('')
    unregisterGlobalShortcut('Alt+E')

    expect(globalShortcut.unregister).toHaveBeenCalledTimes(1)
    expect(globalShortcut.unregister).toHaveBeenCalledWith('Alt+E')
  })
})
