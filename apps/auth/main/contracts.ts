import type { AuthSnapshot, SubscriptionPeriod } from '../types/public'

export type AuthOperation =
  | 'snapshot'
  | 'logout'
  | 'login:create'
  | 'login:check'
  | 'login:cancel'
  | 'purchase:options'
  | 'payment:state'
  | 'payment:create'
  | 'payment:check'
  | 'payment:sync'
  | 'payment:cancel'

type RecordValue = Record<string, unknown>

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isTrimmedString = (value: unknown, maxLength: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength

const isOptionalString = (value: unknown, maxLength: number): value is string =>
  typeof value === 'string' && value.length <= maxLength

const normalizeNullableString = (value: unknown, maxLength: number): string | null => {
  if (value === null || value === undefined) return ''
  return isOptionalString(value, maxLength) ? value : null
}

const isPositiveId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0

const isPrice = (value: unknown): value is string => {
  if (
    typeof value !== 'string' ||
    value.length > 32 ||
    !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)
  ) {
    return false
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0
}

const parseUser = (value: unknown): User | null => {
  if (!isRecord(value)) return null
  const avatar = normalizeNullableString(value.avatar, 4096)
  const createdAt = normalizeNullableString(value.createdAt, 100)
  const updatedAt = normalizeNullableString(value.updatedAt, 100)
  const subscribeEndTime = normalizeNullableString(value.subscribeEndTime, 100)
  const sex = value.sex === null || value.sex === undefined ? 0 : value.sex
  if (
    !isPositiveId(value.id) ||
    !isTrimmedString(value.nickname, 200) ||
    avatar === null ||
    createdAt === null ||
    updatedAt === null ||
    subscribeEndTime === null ||
    typeof sex !== 'number' ||
    !Number.isFinite(sex) ||
    typeof value.isSubscribe !== 'boolean'
  ) {
    return null
  }

  return {
    ...value,
    avatar,
    createdAt,
    updatedAt,
    subscribeEndTime,
    sex
  } as unknown as User
}

export const parseUserEnvelope = (value: unknown): User | null => {
  if (!isRecord(value)) return null
  return parseUser(value.data)
}

export const parseStoredAuth = (value: unknown): Auth | null => {
  if (!isRecord(value) || !isTrimmedString(value.token, 8192)) return null
  const user = parseUser(value.user)
  return user ? ({ ...value, token: value.token.trim(), user } as Auth) : null
}

export const parseSoft = (value: unknown): Soft | null => {
  if (!isRecord(value)) return null
  const subscribeEndTime = normalizeNullableString(value.subscribeEndTime, 100)
  if (
    !isPositiveId(value.id) ||
    !isTrimmedString(value.title, 300) ||
    !isPrice(value.monthlyPrice) ||
    !isPrice(value.yearlyPrice) ||
    typeof value.free !== 'boolean' ||
    typeof value.canUse !== 'boolean' ||
    subscribeEndTime === null
  ) {
    return null
  }

  return { ...value, subscribeEndTime } as unknown as Soft
}

export const parseSubscriptionPeriod = (value: unknown): SubscriptionPeriod | null =>
  value === 'month' || value === 'year' ? value : null

export const canInvokeAuthOperation = (
  operation: string,
  windowName: string
): operation is AuthOperation => {
  if (operation === 'snapshot') return windowName.length > 0
  if (operation === 'logout') return windowName === 'setting'
  if (operation.startsWith('login:')) return windowName === 'login' || windowName === 'setting'
  if (operation === 'purchase:options' || operation.startsWith('payment:')) {
    return windowName === 'pay'
  }
  return false
}

export const createSnapshot = (auth: Auth | null, soft: Soft | null): AuthSnapshot => ({
  auth: auth ? { user: auth.user } : null,
  soft
})

type ParsedLoginResponse = { status: 'pending' } | { status: 'authenticated'; auth: Auth }

export const parseLoginResponse = (value: unknown): ParsedLoginResponse | null => {
  if (value === null || value === undefined || value === '') return { status: 'pending' }
  if (!isRecord(value)) return null
  const auth = parseStoredAuth(value.data)
  return auth ? { status: 'authenticated', auth } : null
}

type ParsedQr = { ticket: string; qrImg: string; expireSeconds: number }

const isQrImage = (value: unknown): value is string => {
  if (!isTrimmedString(value, 4 * 1024 * 1024)) return false
  return value.startsWith('data:image/') || /^https?:\/\//i.test(value)
}

export const parseLoginQrResponse = (value: unknown, fallbackSeconds = 120): ParsedQr | null => {
  if (!isRecord(value) || !isTrimmedString(value.ticket, 2048) || !isQrImage(value.qrImg)) {
    return null
  }
  const rawSeconds = value.expire_seconds
  const expireSeconds =
    typeof rawSeconds === 'number' && Number.isFinite(rawSeconds)
      ? Math.min(3600, Math.max(1, Math.floor(rawSeconds)))
      : fallbackSeconds
  return { ticket: value.ticket, qrImg: value.qrImg, expireSeconds }
}

export const parseSoftEnvelope = (value: unknown): Soft | null => {
  if (!isRecord(value)) return null
  return parseSoft(value.data)
}

export type ParsedPaymentQr = { sn: string; qrImg: string }

export const parsePaymentQrResponse = (value: unknown): ParsedPaymentQr | null => {
  if (!isRecord(value) || !isRecord(value.data)) return null
  const { sn, qrImg } = value.data
  if (!isTrimmedString(sn, 2048) || !isQrImage(qrImg)) return null
  return { sn, qrImg }
}

export const parsePaymentCheckResponse = (value: unknown): boolean | null => {
  // 当前支付接口以字符串响应表示尚未确认；字符串内容不参与成功判断。
  if (typeof value === 'string') return false
  if (!isRecord(value) || !isRecord(value.data) || typeof value.data.success !== 'boolean') {
    return null
  }
  return value.data.success
}
