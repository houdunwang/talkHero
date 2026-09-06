import type { CreateStore } from '../store/CreateStore'

type InitConfigStoreOptions = {
  excludedKeys?: string[]
}

export const initConfigStore = (
  store: CreateStore,
  defaults: Record<string, unknown>,
  options: InitConfigStoreOptions = {}
) => {
  const excludedKeySet = new Set(options.excludedKeys ?? [])

  for (const [name, value] of Object.entries(defaults)) {
    if (excludedKeySet.has(name)) continue
    if (!store.has(name)) {
      store.set(name, value)
    }
  }
}
