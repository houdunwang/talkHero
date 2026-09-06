import { describe, expect, it } from 'vitest'
import {
  canInvokeAuthOperation,
  createSnapshot,
  parseLoginQrResponse,
  parseLoginResponse,
  parsePaymentCheckResponse,
  parsePaymentQrResponse,
  parseSoft,
  parseStoredAuth,
  parseSubscriptionPeriod
} from './contracts'

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

describe('auth contracts', () => {
  it('rejects malformed stored credentials and software data', () => {
    expect(parseStoredAuth({ token: '', user })).toBeNull()
    expect(parseStoredAuth({ token: 'token-value', user: { ...user, id: '7' } })).toBeNull()
    expect(parseSoft({ ...soft, id: 0 })).toBeNull()
    expect(parseSoft({ ...soft, canUse: 'yes' })).toBeNull()
    expect(parseSoft({ ...soft, monthlyPrice: '', yearlyPrice: '   ' })).toBeNull()
  })

  it('accepts only supported subscription periods', () => {
    expect(parseSubscriptionPeriod('month')).toBe('month')
    expect(parseSubscriptionPeriod('year')).toBe('year')
    expect(parseSubscriptionPeriod('lifetime')).toBeNull()
    expect(parseSubscriptionPeriod({ period: 'month' })).toBeNull()
  })

  it('limits operations to their registered window purposes', () => {
    expect(canInvokeAuthOperation('snapshot', 'camera')).toBe(true)
    expect(canInvokeAuthOperation('login:create', 'login')).toBe(true)
    expect(canInvokeAuthOperation('login:create', 'setting')).toBe(true)
    expect(canInvokeAuthOperation('login:create', 'pay')).toBe(false)
    expect(canInvokeAuthOperation('logout', 'setting')).toBe(true)
    expect(canInvokeAuthOperation('logout', 'login')).toBe(false)
    expect(canInvokeAuthOperation('logout', 'pay')).toBe(false)
    expect(canInvokeAuthOperation('payment:create', 'pay')).toBe(true)
    expect(canInvokeAuthOperation('payment:create', 'setting')).toBe(false)
    expect(canInvokeAuthOperation('payment:create', '')).toBe(false)
    expect(canInvokeAuthOperation('unknown', 'setting')).toBe(false)
  })

  it('creates a snapshot without exposing the token', () => {
    const snapshot = createSnapshot({ token: 'secret-token', user }, soft)

    expect(snapshot).toEqual({ auth: { user }, soft })
    expect(snapshot.auth).not.toHaveProperty('token')
  })

  it('validates login and payment endpoint response shapes', () => {
    expect(parseLoginResponse(null)).toEqual({ status: 'pending' })
    expect(parseLoginResponse({ data: { token: 'token-value', user } })).toMatchObject({
      status: 'authenticated'
    })
    expect(parseLoginResponse({ data: { token: '', user } })).toBeNull()

    expect(
      parseLoginQrResponse({
        ticket: 'ticket-1',
        qrImg: 'data:image/png;base64,qr',
        expire_seconds: 99999
      })
    ).toEqual({
      ticket: 'ticket-1',
      qrImg: 'data:image/png;base64,qr',
      expireSeconds: 3600
    })
    expect(parseLoginQrResponse({ ticket: '', qrImg: 'javascript:alert(1)' })).toBeNull()

    expect(
      parsePaymentQrResponse({ data: { sn: 'order-1', qrImg: 'data:image/png;base64,pay' } })
    ).toEqual({ sn: 'order-1', qrImg: 'data:image/png;base64,pay' })
    expect(
      parsePaymentQrResponse({ data: { sn: null, qrImg: 'data:image/png;base64,pay' } })
    ).toBeNull()
    expect(parsePaymentCheckResponse('opaque-pending-body')).toBe(false)
    expect(parsePaymentCheckResponse({ data: { success: false } })).toBe(false)
    expect(parsePaymentCheckResponse({ data: { success: true } })).toBe(true)
    expect(parsePaymentCheckResponse({ data: { success: 'true' } })).toBeNull()
    expect(parsePaymentCheckResponse(true)).toBeNull()
  })

  it('normalizes nullable profile and entitlement metadata returned for new accounts', () => {
    expect(
      parseLoginResponse({
        data: {
          token: 'token-value',
          user: {
            ...user,
            sex: null,
            avatar: null,
            subscribeEndTime: null
          }
        }
      })
    ).toEqual({
      status: 'authenticated',
      auth: {
        token: 'token-value',
        user: {
          ...user,
          sex: 0,
          avatar: '',
          subscribeEndTime: ''
        }
      }
    })

    expect(parseSoft({ ...soft, subscribeEndTime: null })).toEqual({
      ...soft,
      subscribeEndTime: ''
    })
  })
})
