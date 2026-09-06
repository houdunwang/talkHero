import { shell } from 'electron'

const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:'])

const getSafeExternalUrl = (value: unknown): URL | null => {
  if (typeof value !== 'string' || !value.trim()) return null

  try {
    const url = new URL(value)
    return ALLOWED_EXTERNAL_PROTOCOLS.has(url.protocol) ? url : null
  } catch {
    return null
  }
}

export const openSafeExternalUrl = async (value: unknown): Promise<boolean> => {
  const url = getSafeExternalUrl(value)
  if (!url) return false

  await shell.openExternal(url.toString())
  return true
}
