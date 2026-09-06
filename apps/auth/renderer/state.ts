import { atom } from 'jotai'
import type { AuthSnapshot } from '../types/public'

export const authAtom = atom<AuthSnapshot['auth']>(null)
export const softAtom = atom<Soft | null>(null)

export const loadAuthSnapshot = async (): Promise<AuthSnapshot> => {
  const result = await window.auth.getSnapshot()
  if (!result.ok) throw new Error(result.message)
  return result.data
}
