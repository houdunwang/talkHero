import { describe, expect, it, vi } from 'vitest'

describe('shared current script session', () => {
  it('notifies every mounted consumer when either section edits the script', async () => {
    vi.resetModules()
    const {
      currentScriptSession,
      initializeCurrentScript,
      lockCurrentScript,
      unlockCurrentScript,
      updateCurrentScript
    } = await import('./current-script-session')
    const observed: string[] = []
    const unsubscribe = currentScriptSession.subscribe(() => {
      observed.push(currentScriptSession.read().script)
    })

    initializeCurrentScript('stored script')
    updateCurrentScript('voice section edit')

    expect(currentScriptSession.read().script).toBe('voice section edit')
    expect(observed).toEqual(['stored script', 'voice section edit'])

    lockCurrentScript('voice')
    lockCurrentScript('publish')
    lockCurrentScript('publish')
    unlockCurrentScript('publish')
    expect(currentScriptSession.read().locks).toEqual({ voice: 1, publish: 1 })
    unlockCurrentScript('voice')
    unlockCurrentScript('publish')
    expect(currentScriptSession.read().locks).toEqual({ voice: 0, publish: 0 })
    unsubscribe()
  })
})
