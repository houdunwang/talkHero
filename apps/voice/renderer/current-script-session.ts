import { createRouteSession } from '@apps/core/renderer/route-session'

type ScriptOwner = 'voice' | 'publish'

export const currentScriptSession = createRouteSession({
  script: '',
  locks: { voice: 0, publish: 0 }
})

let initialized = false

export const initializeCurrentScript = (script: string): void => {
  if (initialized) return
  initialized = true
  currentScriptSession.patch({ script })
}

export const updateCurrentScript = (script: string): void => {
  currentScriptSession.patch({ script })
}

export const lockCurrentScript = (owner: ScriptOwner): void => {
  const current = currentScriptSession.read()
  currentScriptSession.patch({
    locks: { ...current.locks, [owner]: current.locks[owner] + 1 }
  })
}

export const unlockCurrentScript = (owner: ScriptOwner): void => {
  const current = currentScriptSession.read()
  currentScriptSession.patch({
    locks: { ...current.locks, [owner]: Math.max(0, current.locks[owner] - 1) }
  })
}
