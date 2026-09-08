import { describe, expect, it, vi } from 'vitest'
import { AuthFlow, type AuthRequestOptions, type AuthRequestResult } from './flow'

const user: User = {
  id: 7,
  nickname: '测试用户',
  sex: 0,
  avatar: 'https://example.invalid/avatar.png',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  subscribeEndTime: '2027-01-01T00:00:00Z',
  isSubscribe: true
}

const soft = {
  id: 3,
  title: '桌上功夫',
  monthlyPrice: '10.00',
  yearlyPrice: '100.00',
  free: false,
  canUse: true,
  subscribeEndTime: '2027-01-01T00:00:00Z'
} as Soft

const auth: Auth = { token: 'test-token', user }
const ok = (data: unknown): AuthRequestResult => ({ ok: true, status: 200, data })
const failed = (status: number): AuthRequestResult => ({ ok: false, status, data: null })

function createHarness(
  initial: Record<string, unknown> = {},
  packageName = 'houdunyun-talkHero'
): {
  flow: AuthFlow
  values: Map<string, unknown>
  requests: AuthRequestOptions[]
  responses: Array<AuthRequestResult | Promise<AuthRequestResult>>
  advance: (milliseconds: number) => void
} {
  const values = new Map(Object.entries(initial))
  const set = vi.fn((key: string, value: unknown) => values.set(key, value))
  const responses: Array<AuthRequestResult | Promise<AuthRequestResult>> = []
  const requests: AuthRequestOptions[] = []
  let timestamp = 10_000
  const request = vi.fn(async (options: AuthRequestOptions) => {
    requests.push(options)
    const response = responses.shift()
    if (!response) throw new Error(`缺少 ${options.url} 的测试响应`)
    return response
  })
  const flow = new AuthFlow({
    request,
    store: { get: (key) => values.get(key), set },
    packageName,
    now: () => timestamp
  })

  return {
    flow,
    values,
    requests,
    responses,
    advance: (milliseconds: number) => {
      timestamp += milliseconds
    }
  }
}

describe('AuthFlow login and access', () => {
  it('single-flights concurrent login QR creation', async () => {
    const harness = createHarness()
    let resolveCreate: (result: AuthRequestResult) => void = () => undefined
    harness.responses.push(new Promise((resolve) => (resolveCreate = resolve)))

    const first = harness.flow.createLoginQr(10)
    const second = harness.flow.createLoginQr(10)
    expect(harness.requests).toHaveLength(1)

    resolveCreate(ok({ ticket: 'ticket-1', qrImg: 'data:image/png;base64,qr' }))
    expect(await first).toEqual(await second)
  })

  it('keeps credentials in main and authenticates only the current login session', async () => {
    const harness = createHarness()
    harness.responses.push(
      ok({ ticket: 'ticket-1', qrImg: 'data:image/png;base64,qr', expire_seconds: 60 }),
      ok(null),
      ok({ data: auth }),
      ok({ data: soft })
    )

    const qr = await harness.flow.createLoginQr(10)
    expect(qr).toEqual({
      ok: true,
      data: { qrImg: 'data:image/png;base64,qr', expiresAt: 70_000 }
    })
    expect(qr).not.toHaveProperty('data.ticket')

    expect(await harness.flow.checkLogin(10)).toEqual({ ok: true, data: { status: 'pending' } })
    harness.advance(3_000)
    const login = await harness.flow.checkLogin(10)

    expect(login).toEqual({
      ok: true,
      data: { status: 'authenticated', snapshot: { auth: { user }, soft } }
    })
    expect(harness.values.get('auth')).toEqual(auth)
    expect(login).not.toHaveProperty('data.snapshot.auth.token')
    expect(harness.requests.at(-1)).toEqual({
      url: '/soft/softs/by-name/houdunyun-talkHero',
      method: 'GET',
      authToken: 'test-token'
    })
    expect(harness.requests.some(({ url }) => url.startsWith('/core/softs/'))).toBe(false)
  })

  it('ignores an authentication response after the session is cancelled', async () => {
    const harness = createHarness()
    harness.responses.push(
      ok({ ticket: 'ticket-1', qrImg: 'data:image/png;base64,qr', expire_seconds: 60 })
    )
    await harness.flow.createLoginQr(10)

    let resolveCheck: (result: AuthRequestResult) => void = () => undefined
    harness.responses.push(new Promise((resolve) => (resolveCheck = resolve)))
    const pending = harness.flow.checkLogin(10)
    harness.flow.cancelLogin(10)
    resolveCheck(ok({ data: auth }))

    expect(await pending).toMatchObject({ ok: false, code: 'no-session' })
    expect(harness.values.has('auth')).toBe(false)
  })

  it('does not persist authentication when cancelled during entitlement refresh', async () => {
    const harness = createHarness()
    harness.responses.push(
      ok({ ticket: 'ticket-1', qrImg: 'data:image/png;base64,qr', expire_seconds: 60 }),
      ok({ data: auth })
    )
    await harness.flow.createLoginQr(10)

    let resolveSoft: (result: AuthRequestResult) => void = () => undefined
    harness.responses.push(new Promise((resolve) => (resolveSoft = resolve)))
    const pending = harness.flow.checkLogin(10)
    await vi.waitFor(() =>
      expect(harness.requests.at(-1)?.url).toBe('/soft/softs/by-name/houdunyun-talkHero')
    )
    harness.flow.cancelLogin(10)
    resolveSoft(ok({ data: soft }))

    expect(await pending).toMatchObject({ ok: false, code: 'no-session' })
    expect(harness.values.has('auth')).toBe(false)
    expect(harness.values.has('soft')).toBe(false)
  })

  it('clears cached auth only for 401 and retains it for network failure', async () => {
    const unauthorized = createHarness({ auth, soft })
    unauthorized.responses.push(failed(401), ok({ data: soft }))
    expect(await unauthorized.flow.getWebsiteAccessStatus(true)).toBe('logged-out')
    expect(unauthorized.values.get('auth')).toBeNull()
    expect(unauthorized.values.get('soft')).toBeNull()

    const offline = createHarness({ auth, soft })
    offline.responses.push(failed(0), failed(0))
    expect(await offline.flow.getWebsiteAccessStatus(true)).toBe('active')
    expect(offline.values.get('auth')).toEqual(auth)
    expect(offline.values.get('soft')).toEqual(soft)
  })

  it('refreshes software through the encoded software namespace', async () => {
    const encoded = createHarness({ auth, soft }, 'houdunyun/ruyi ?desktop')
    const refreshedSoft = { ...soft, canUse: false }
    encoded.responses.push(ok({ data: user }), ok({ data: refreshedSoft }))

    expect(await encoded.flow.getWebsiteAccessStatus(true)).toBe('inactive')
    expect(encoded.values.get('soft')).toEqual(refreshedSoft)
    expect(encoded.requests).toEqual([
      { url: '/core/users/profile', method: 'GET' },
      {
        url: '/soft/softs/by-name/houdunyun%2Fruyi%20%3Fdesktop',
        method: 'GET'
      }
    ])
  })

  it('does not overwrite cached software with an invalid refresh response', async () => {
    const harness = createHarness({ auth, soft })
    harness.responses.push(ok({ data: user }), ok({ data: null }))

    expect(await harness.flow.getWebsiteAccessStatus(true)).toBe('active')
    expect(harness.values.get('soft')).toEqual(soft)
    expect(harness.requests.at(-1)?.url).toBe('/soft/softs/by-name/houdunyun-talkHero')
  })
})

describe('AuthFlow logout', () => {
  it.each([
    ['successful response', ok(null)],
    ['expired token', failed(401)]
  ])('revokes the current token and clears local state for a %s', async (_, response) => {
    const harness = createHarness({ auth, soft })
    harness.responses.push(
      ok({ ticket: 'ticket-1', qrImg: 'data:image/png;base64,qr', expire_seconds: 60 }),
      ok({ data: { ...soft, canUse: false } }),
      response
    )
    await harness.flow.createLoginQr(10)
    await harness.flow.getPurchaseOptions(20)

    expect(await harness.flow.logout()).toEqual({
      ok: true,
      data: { auth: null, soft: null }
    })
    expect(harness.requests.at(-1)).toEqual({
      url: '/core/logout',
      method: 'POST',
      authToken: 'test-token',
      redirectOnUnauthorized: false
    })
    expect(harness.values.get('auth')).toBeNull()
    expect(harness.values.get('soft')).toBeNull()
    expect(await harness.flow.checkLogin(10)).toMatchObject({ ok: false, code: 'no-session' })

    harness.values.set('auth', auth)
    expect(await harness.flow.createPayment(20, 'month')).toMatchObject({
      ok: false,
      code: 'not-ready'
    })
  })

  it.each([
    ['server failure', () => Promise.resolve(failed(500))],
    ['network failure', () => Promise.reject(new Error('offline'))]
  ])('keeps auth and active sessions after a %s', async (_, createResponse) => {
    const harness = createHarness({ auth, soft })
    harness.responses.push(
      ok({ ticket: 'ticket-1', qrImg: 'data:image/png;base64,qr', expire_seconds: 60 }),
      createResponse()
    )
    await harness.flow.createLoginQr(10)

    expect(await harness.flow.logout()).toMatchObject({ ok: false, code: 'network' })
    expect(harness.values.get('auth')).toEqual(auth)
    expect(harness.values.get('soft')).toEqual(soft)

    harness.responses.push(ok(null))
    expect(await harness.flow.checkLogin(10)).toEqual({
      ok: true,
      data: { status: 'pending' }
    })
  })

  it('single-flights concurrent logout requests', async () => {
    const harness = createHarness({ auth, soft })
    let resolveLogout: (result: AuthRequestResult) => void = () => undefined
    harness.responses.push(new Promise((resolve) => (resolveLogout = resolve)))

    const first = harness.flow.logout()
    const second = harness.flow.logout()
    expect(harness.requests).toHaveLength(1)

    resolveLogout(ok(null))
    expect(await first).toEqual(await second)
    expect(harness.requests).toHaveLength(1)
  })

  it('ignores an authorization refresh that finishes after logout', async () => {
    const harness = createHarness({ auth, soft })
    let resolveProfile: (result: AuthRequestResult) => void = () => undefined
    let resolveSoft: (result: AuthRequestResult) => void = () => undefined
    harness.responses.push(
      new Promise((resolve) => (resolveProfile = resolve)),
      new Promise((resolve) => (resolveSoft = resolve)),
      ok(null)
    )

    const refresh = harness.flow.getWebsiteAccessStatus(true)
    await vi.waitFor(() => expect(harness.requests).toHaveLength(2))
    expect(await harness.flow.logout()).toMatchObject({ ok: true })

    resolveProfile(ok({ data: { ...user, nickname: '旧响应' } }))
    resolveSoft(ok({ data: { ...soft, title: '旧响应' } }))
    expect(await refresh).toBe('logged-out')
    expect(harness.values.get('auth')).toBeNull()
    expect(harness.values.get('soft')).toBeNull()
  })
})

describe('AuthFlow payment', () => {
  it('single-flights payment creation across cancellation and rejects a concurrent period', async () => {
    const harness = createHarness({ auth, soft: { ...soft, canUse: false } })
    harness.responses.push(ok({ data: { ...soft, canUse: false } }))
    await harness.flow.getPurchaseOptions(20)

    let resolveCreate: (result: AuthRequestResult) => void = () => undefined
    harness.responses.push(new Promise((resolve) => (resolveCreate = resolve)))
    const first = harness.flow.createPayment(20, 'month')
    const wrongPeriod = await harness.flow.createPayment(20, 'year')
    harness.flow.cancelPayment(20)
    const resumed = harness.flow.createPayment(20, 'month')
    expect(harness.requests.filter(({ url }) => url === '/soft/pays/softWepay')).toHaveLength(1)
    expect(wrongPeriod).toMatchObject({ ok: false, code: 'not-ready' })

    resolveCreate(ok({ data: { sn: 'order-1', qrImg: 'data:image/png;base64,pay' } }))
    expect(await first).toMatchObject({ ok: false, code: 'no-session' })
    expect(await resumed).toMatchObject({ ok: true })
  })

  it('requires online options and derives softId in main', async () => {
    const harness = createHarness({ auth, soft: { ...soft, canUse: false } })
    harness.responses.push(
      ok({ data: { ...soft, canUse: false } }),
      ok({ data: { sn: 'order-1', qrImg: 'data:image/png;base64,pay' } })
    )

    expect(await harness.flow.getPurchaseOptions(20)).toMatchObject({ ok: true })
    expect(await harness.flow.createPayment(20, 'year')).toMatchObject({
      ok: true,
      data: { qrImg: 'data:image/png;base64,pay' }
    })
    expect(harness.requests.at(-1)).toEqual({
      url: '/soft/pays/softWepay',
      method: 'POST',
      data: { softId: 3, period: 'year' }
    })

    const noOptions = createHarness({ auth, soft })
    expect(await noOptions.flow.createPayment(20, 'month')).toMatchObject({
      ok: false,
      code: 'not-ready'
    })
  })

  it('keeps fresh online options when replacing an unconfirmed payment session', async () => {
    const harness = createHarness({ auth, soft: { ...soft, canUse: false } })
    harness.responses.push(
      ok({ data: { ...soft, canUse: false } }),
      ok({ data: { sn: 'order-1', qrImg: 'data:image/png;base64,pay' } })
    )
    await harness.flow.getPurchaseOptions(20)
    harness.flow.cancelPayment(20)

    expect(await harness.flow.createPayment(20, 'month')).toMatchObject({ ok: true })
  })

  it('does not create another order after confirmation and retries entitlement sync', async () => {
    const harness = createHarness({ auth, soft: { ...soft, canUse: false } })
    harness.responses.push(
      ok({ data: { ...soft, canUse: false } }),
      ok({ data: { sn: 'order-1', qrImg: 'data:image/png;base64,pay' } }),
      ok({ data: { success: true } }),
      failed(0),
      ok({ data: soft })
    )
    await harness.flow.getPurchaseOptions(20)
    await harness.flow.createPayment(20, 'month')

    expect(await harness.flow.checkPayment(20)).toEqual({
      ok: true,
      data: { status: 'confirmed', message: '支付已确认，权益同步中' }
    })
    expect(harness.requests.at(2)).toEqual({
      url: '/soft/pays/softWepayCheck',
      method: 'POST',
      data: { sn: 'order-1' }
    })
    expect(await harness.flow.createPayment(20, 'month')).toMatchObject({
      ok: false,
      code: 'payment-confirmed'
    })

    expect(await harness.flow.syncPayment(20)).toEqual({
      ok: true,
      data: { status: 'active', snapshot: { auth: { user }, soft } }
    })
    expect(harness.requests.filter(({ url }) => url === '/soft/pays/softWepay')).toHaveLength(1)
  })

  it.each([
    ['pending', ok('waiting'), { ok: true, data: { status: 'pending' } }, false],
    ['401', failed(401), { ok: false, code: 'unauthorized' }, true],
    ['network failure', failed(0), { ok: false, code: 'network' }, false],
    [
      'invalid response',
      ok({ data: { success: 'yes' } }),
      { ok: false, code: 'invalid-response' },
      false
    ]
  ])('keeps the payment check contract for %s', async (_, checkResponse, expected, clearsAuth) => {
    const harness = createHarness({ auth, soft: { ...soft, canUse: false } })
    harness.responses.push(
      ok({ data: { ...soft, canUse: false } }),
      ok({ data: { sn: 'order-1', qrImg: 'data:image/png;base64,pay' } }),
      checkResponse
    )
    await harness.flow.getPurchaseOptions(20)
    await harness.flow.createPayment(20, 'month')

    expect(await harness.flow.checkPayment(20)).toMatchObject(expected)
    expect(harness.requests.at(2)).toEqual({
      url: '/soft/pays/softWepayCheck',
      method: 'POST',
      data: { sn: 'order-1' }
    })
    expect(harness.values.get('auth')).toEqual(clearsAuth ? null : auth)
    expect(harness.values.get('soft')).toEqual(clearsAuth ? null : { ...soft, canUse: false })
  })

  it('expires sessions and ignores a late payment response after disposal', async () => {
    const harness = createHarness({ auth, soft: { ...soft, canUse: false } })
    harness.responses.push(
      ok({ data: { ...soft, canUse: false } }),
      ok({ data: { sn: 'order-1', qrImg: 'data:image/png;base64,pay' } })
    )
    await harness.flow.getPurchaseOptions(20)
    await harness.flow.createPayment(20, 'month')

    let resolveCheck: (result: AuthRequestResult) => void = () => undefined
    harness.responses.push(new Promise((resolve) => (resolveCheck = resolve)))
    const pending = harness.flow.checkPayment(20)
    harness.flow.disposeClient(20)
    resolveCheck(ok({ data: { success: true } }))

    expect(await pending).toMatchObject({ ok: false, code: 'no-session' })

    const expired = createHarness({ auth, soft: { ...soft, canUse: false } })
    expired.responses.push(
      ok({ data: { ...soft, canUse: false } }),
      ok({ data: { sn: 'order-2', qrImg: 'data:image/png;base64,pay' } })
    )
    await expired.flow.getPurchaseOptions(30)
    await expired.flow.createPayment(30, 'month')
    expired.advance(181_000)
    expect(await expired.flow.checkPayment(30)).toEqual({
      ok: true,
      data: { status: 'expired' }
    })
  })

  it('retains a confirmed payment for entitlement sync after the pay window is replaced', async () => {
    const harness = createHarness({ auth, soft: { ...soft, canUse: false } })
    harness.responses.push(
      ok({ data: { ...soft, canUse: false } }),
      ok({ data: { sn: 'order-1', qrImg: 'data:image/png;base64,pay' } }),
      ok({ data: { success: true } }),
      failed(0)
    )
    await harness.flow.getPurchaseOptions(20)
    await harness.flow.createPayment(20, 'month')
    expect(await harness.flow.checkPayment(20)).toMatchObject({
      ok: true,
      data: { status: 'confirmed' }
    })

    harness.flow.disposeClient(20)
    harness.responses.push(ok({ data: { ...soft, canUse: false } }), ok({ data: soft }))
    expect(await harness.flow.getPurchaseOptions(21)).toMatchObject({
      ok: true,
      data: { paymentConfirmed: true }
    })
    expect(await harness.flow.createPayment(21, 'year')).toMatchObject({
      ok: false,
      code: 'payment-confirmed'
    })
    expect(await harness.flow.syncPayment(21)).toMatchObject({
      ok: true,
      data: { status: 'active' }
    })
  })

  it('exposes confirmed recovery while offline and isolates it from another account', async () => {
    const harness = createHarness({ auth, soft: { ...soft, canUse: false } })
    harness.responses.push(
      ok({ data: { ...soft, canUse: false } }),
      ok({ data: { sn: 'order-1', qrImg: 'data:image/png;base64,pay' } }),
      ok({ data: { success: true } }),
      failed(0)
    )
    await harness.flow.getPurchaseOptions(20)
    await harness.flow.createPayment(20, 'month')
    await harness.flow.checkPayment(20)
    harness.flow.disposeClient(20)

    expect(harness.flow.getPaymentState()).toEqual({ confirmed: true })

    const otherUser = { ...user, id: 8 }
    const otherAuth = { token: 'other-token', user: otherUser }
    harness.responses.push(
      ok({ ticket: 'ticket-2', qrImg: 'data:image/png;base64,qr' }),
      ok({ data: otherAuth }),
      ok({ data: { ...soft, canUse: false } })
    )
    await harness.flow.createLoginQr(30)
    await harness.flow.checkLogin(30)
    expect(harness.flow.getPaymentState()).toEqual({ confirmed: false })

    harness.values.set('auth', auth)
    expect(harness.flow.getPaymentState()).toEqual({ confirmed: false })
  })

  it('does not let a pre-logout sync finalizer clear a new sync single-flight', async () => {
    const inactiveSoft = { ...soft, canUse: false }
    const harness = createHarness({ auth, soft: inactiveSoft })
    let resolveOldSync: (result: AuthRequestResult) => void = () => undefined
    harness.responses.push(
      ok({ data: inactiveSoft }),
      ok({ data: { sn: 'order-1', qrImg: 'data:image/png;base64,pay' } }),
      ok({ data: { success: true } }),
      new Promise((resolve) => (resolveOldSync = resolve))
    )
    await harness.flow.getPurchaseOptions(20)
    await harness.flow.createPayment(20, 'month')
    const oldSync = harness.flow.checkPayment(20)
    await vi.waitFor(() =>
      expect(harness.requests.at(-1)?.url).toBe('/soft/softs/by-name/houdunyun-talkHero')
    )

    harness.responses.push(ok(null))
    expect(await harness.flow.logout()).toMatchObject({ ok: true })
    harness.values.set('auth', auth)
    harness.values.set('soft', inactiveSoft)

    let resolveNewSync: (result: AuthRequestResult) => void = () => undefined
    harness.responses.push(
      ok({ data: inactiveSoft }),
      ok({ data: { sn: 'order-2', qrImg: 'data:image/png;base64,pay' } }),
      ok({ data: { success: true } }),
      new Promise((resolve) => (resolveNewSync = resolve))
    )
    await harness.flow.getPurchaseOptions(21)
    await harness.flow.createPayment(21, 'month')
    const newSync = harness.flow.checkPayment(21)
    await vi.waitFor(() =>
      expect(
        harness.requests.filter(({ url }) => url === '/soft/softs/by-name/houdunyun-talkHero')
      ).toHaveLength(4)
    )

    resolveOldSync(failed(0))
    await oldSync
    const repeatedSync = harness.flow.syncPayment(21)
    expect(
      harness.requests.filter(({ url }) => url === '/soft/softs/by-name/houdunyun-talkHero')
    ).toHaveLength(4)

    resolveNewSync(ok({ data: soft }))
    expect(await repeatedSync).toEqual(await newSync)
  })
})
