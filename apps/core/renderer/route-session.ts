import { useSyncExternalStore } from 'react'

export type RouteSession<T extends object> = {
  read: () => Readonly<T>
  patch: (patch: Partial<T>) => void
  subscribe: (listener: () => void) => () => void
}

// Keeps ephemeral workflow results alive while routes inside the same managed window are swapped.
export const createRouteSession = <T extends object>(initialValue: T): RouteSession<T> => {
  let value = { ...initialValue }
  const listeners = new Set<() => void>()
  return {
    read: (): Readonly<T> => value,
    patch: (patch: Partial<T>): void => {
      value = { ...value, ...patch }
      listeners.forEach((listener) => listener())
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }
  }
}

export const useRouteSession = <T extends object>(session: RouteSession<T>): Readonly<T> =>
  useSyncExternalStore(session.subscribe, session.read, session.read)
