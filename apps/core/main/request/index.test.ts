import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@config/request', () => ({
  default: { baseUrl: 'https://api.example.test/api' }
}))

vi.mock('../window/functions', () => ({
  closeWindows: vi.fn()
}))

import { closeWindows } from '../window/functions'
import { sendRequest } from '.'

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('main request unauthorized redirect', () => {
  it('keeps the default 401 redirect behavior', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const result = await sendRequest({
      url: '/core/users/profile',
      headers: { authorization: 'Bearer test-token' }
    })

    expect(result.status).toBe(401)
    expect(closeWindows).toHaveBeenCalledOnce()
    expect(closeWindows).toHaveBeenCalledWith(['login'])
  })

  it('allows an atomic caller to handle 401 without an early redirect', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const result = await sendRequest({
      url: '/core/logout',
      method: 'POST',
      headers: { authorization: 'Bearer test-token' },
      redirectOnUnauthorized: false
    })

    expect(result.status).toBe(401)
    expect(closeWindows).not.toHaveBeenCalled()
  })
})
