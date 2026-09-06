// Renderer 只接收认证与订阅展示所需的数据，认证令牌保留在主进程。
export type AuthView = {
  user: User
}

export type AuthSnapshot = {
  auth: AuthView | null
  soft: Soft | null
}

export type AuthErrorCode =
  | 'forbidden'
  | 'invalid-input'
  | 'invalid-response'
  | 'network'
  | 'unauthorized'
  | 'expired'
  | 'no-session'
  | 'not-ready'
  | 'payment-confirmed'

export type AuthFailure = {
  ok: false
  code: AuthErrorCode
  message: string
}

export type AuthResult<T> = { ok: true; data: T } | AuthFailure

export type LoginQr = {
  qrImg: string
  expiresAt: number
}

export type LoginCheck =
  | { status: 'pending' }
  | { status: 'authenticated'; snapshot: AuthSnapshot }
  | { status: 'expired' }

export type PurchaseOptions = {
  soft: Soft
  source: 'online'
  paymentConfirmed: boolean
}

export type PaymentState = {
  confirmed: boolean
}

export type SubscriptionPeriod = 'month' | 'year'

export type PaymentQr = {
  qrImg: string
  expiresAt: number
}

export type PaymentCheck =
  | { status: 'pending' }
  | { status: 'confirmed'; message: string }
  | { status: 'active'; snapshot: AuthSnapshot }
  | { status: 'expired' }
