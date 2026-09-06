import type {
  AuthResult,
  PaymentCheck,
  PaymentQr,
  PaymentState,
  PurchaseOptions,
  SubscriptionPeriod
} from '../types/public'
import {
  parsePaymentCheckResponse,
  parsePaymentQrResponse,
  type ParsedPaymentQr
} from './contracts'
import { AuthorizationState, failure, success } from './authorization'

type PaymentSession = {
  sn: string
  expiresAt: number
  lastCheckAt: number
  checkPromise?: Promise<AuthResult<PaymentCheck>>
}

type PurchaseRecord = { soft: Soft; fetchedAt: number }

const MIN_CHECK_INTERVAL = 2_500
const PAYMENT_EXPIRES_AFTER = 180_000
const PURCHASE_OPTIONS_MAX_AGE = 5 * 60_000

// 支付会话负责在线报价、订单单飞、支付确认归属和权益同步恢复。
export class PaymentFlow {
  private readonly generations = new Map<number, number>()
  private readonly sessions = new Map<number, PaymentSession>()
  private readonly purchaseOptions = new Map<number, PurchaseRecord>()
  private createInFlight: {
    ownerId: number
    period: SubscriptionPeriod
    promise: Promise<AuthResult<ParsedPaymentQr>>
  } | null = null
  private confirmedOwnerId: number | null = null
  private confirmedSyncPromise: Promise<AuthResult<PaymentCheck>> | null = null

  constructor(
    private readonly authorization: AuthorizationState,
    private readonly now: () => number
  ) {}

  getState(): PaymentState {
    return { confirmed: this.hasConfirmedPaymentForCurrentAccount() }
  }

  async getPurchaseOptions(clientId: number): Promise<AuthResult<PurchaseOptions>> {
    const refreshed = await this.authorization.refreshSoftware()
    if (!refreshed.ok) return refreshed
    if (refreshed.data.canUse === true && this.hasConfirmedPaymentForCurrentAccount()) {
      this.confirmedOwnerId = null
    }
    this.purchaseOptions.set(clientId, { soft: refreshed.data, fetchedAt: this.now() })
    return success({
      soft: refreshed.data,
      source: 'online',
      paymentConfirmed: this.hasConfirmedPaymentForCurrentAccount()
    })
  }

  async create(clientId: number, period: SubscriptionPeriod): Promise<AuthResult<PaymentQr>> {
    if (this.hasConfirmedPaymentForCurrentAccount()) {
      return failure('payment-confirmed', '支付已确认，请先同步权益')
    }

    const options = this.purchaseOptions.get(clientId)
    if (!options || this.now() - options.fetchedAt > PURCHASE_OPTIONS_MAX_AGE) {
      return failure('not-ready', '请先在线刷新当前软件订阅信息')
    }
    if (options.soft.free) return failure('not-ready', '当前软件无需购买')

    const auth = this.authorization.getAuth()
    if (!auth) return failure('unauthorized', '登录状态已失效')

    let createPromise: Promise<AuthResult<ParsedPaymentQr>>
    if (this.createInFlight) {
      if (this.createInFlight.ownerId !== auth.user.id || this.createInFlight.period !== period) {
        return failure('not-ready', '另一套餐订单正在创建，请稍后重试')
      }
      createPromise = this.createInFlight.promise
    } else {
      createPromise = this.requestQr(options.soft.id, period)
      this.createInFlight = { ownerId: auth.user.id, period, promise: createPromise }
      void createPromise.finally(() => {
        if (this.createInFlight?.promise === createPromise) this.createInFlight = null
      })
    }

    const generation = this.nextGeneration(clientId)
    this.sessions.delete(clientId)
    const result = await createPromise
    if (this.generations.get(clientId) !== generation) {
      return failure('no-session', '支付会话已替换')
    }
    if (!result.ok) return result

    const expiresAt = this.now() + PAYMENT_EXPIRES_AFTER
    this.sessions.set(clientId, {
      sn: result.data.sn,
      expiresAt,
      lastCheckAt: 0
    })
    return success({ qrImg: result.data.qrImg, expiresAt })
  }

  async check(clientId: number): Promise<AuthResult<PaymentCheck>> {
    const session = this.sessions.get(clientId)
    if (!session) return failure('no-session', '支付会话不存在或已结束')
    if (this.hasConfirmedPaymentForCurrentAccount()) return this.sync(clientId)
    if (this.now() >= session.expiresAt) {
      this.sessions.delete(clientId)
      return success({ status: 'expired' })
    }
    if (session.checkPromise) return session.checkPromise
    if (session.lastCheckAt > 0 && this.now() - session.lastCheckAt < MIN_CHECK_INTERVAL) {
      return success({ status: 'pending' })
    }

    session.lastCheckAt = this.now()
    const promise = this.performCheck(clientId, session)
    session.checkPromise = promise
    return promise.finally(() => {
      if (this.sessions.get(clientId) === session) session.checkPromise = undefined
    })
  }

  async sync(clientId: number): Promise<AuthResult<PaymentCheck>> {
    const session = this.sessions.get(clientId)
    if (!this.hasConfirmedPaymentForCurrentAccount()) {
      return failure('no-session', '没有待同步的已确认支付')
    }
    if (this.confirmedSyncPromise) return this.confirmedSyncPromise

    const promise = this.performSync(clientId, session)
    this.confirmedSyncPromise = promise
    return promise.finally(() => {
      if (this.confirmedSyncPromise === promise) this.confirmedSyncPromise = null
    })
  }

  cancel(clientId: number): void {
    this.nextGeneration(clientId)
    this.sessions.delete(clientId)
  }

  disposeClient(clientId: number): void {
    this.cancel(clientId)
    this.purchaseOptions.delete(clientId)
  }

  reset(): void {
    const clientIds = new Set([
      ...this.generations.keys(),
      ...this.sessions.keys(),
      ...this.purchaseOptions.keys()
    ])
    clientIds.forEach((clientId) => this.nextGeneration(clientId))
    this.sessions.clear()
    this.purchaseOptions.clear()
    this.createInFlight = null
    this.confirmedOwnerId = null
    this.confirmedSyncPromise = null
  }

  reconcileConfirmedOwner(userId: number): void {
    if (this.confirmedOwnerId !== null && this.confirmedOwnerId !== userId) {
      this.confirmedOwnerId = null
      this.sessions.clear()
      this.confirmedSyncPromise = null
    }
  }

  private async requestQr(
    softId: number,
    period: SubscriptionPeriod
  ): Promise<AuthResult<ParsedPaymentQr>> {
    const response = await this.authorization.safeRequest({
      url: '/soft/pays/softWepay',
      method: 'POST',
      data: { softId, period }
    })
    if (!response.ok) return this.authorization.requestFailure(response, '获取支付二维码失败')
    const qr = parsePaymentQrResponse(response.data)
    return qr ? success(qr) : failure('invalid-response', '服务未返回有效的支付二维码')
  }

  private async performCheck(
    clientId: number,
    session: PaymentSession
  ): Promise<AuthResult<PaymentCheck>> {
    const response = await this.authorization.safeRequest({
      url: '/soft/pays/softWepayCheck',
      method: 'POST',
      data: { sn: session.sn }
    })
    if (this.sessions.get(clientId) !== session) {
      return failure('no-session', '支付会话已结束')
    }
    if (!response.ok) return this.authorization.requestFailure(response, '支付状态查询失败')

    const paid = parsePaymentCheckResponse(response.data)
    if (paid === null) return failure('invalid-response', '服务返回了无效的支付状态')
    if (!paid) return success({ status: 'pending' })

    const auth = this.authorization.getAuth()
    if (!auth) {
      this.authorization.clearAuthorization()
      return failure('unauthorized', '登录状态已失效')
    }
    this.confirmedOwnerId = auth.user.id
    return this.sync(clientId)
  }

  private async performSync(
    clientId: number,
    session: PaymentSession | undefined
  ): Promise<AuthResult<PaymentCheck>> {
    const refreshed = await this.authorization.refreshSoftware()
    if (!refreshed.ok && refreshed.code === 'unauthorized') return refreshed
    if (!this.hasConfirmedPaymentForCurrentAccount()) {
      return failure('no-session', '支付确认状态已结束')
    }
    if (session && this.sessions.get(clientId) !== session) {
      return failure('no-session', '支付会话已结束')
    }
    if (!refreshed.ok || refreshed.data.canUse !== true) {
      return success({ status: 'confirmed', message: '支付已确认，权益同步中' })
    }

    this.confirmedOwnerId = null
    this.sessions.clear()
    this.purchaseOptions.clear()
    return success({ status: 'active', snapshot: this.authorization.getSnapshot() })
  }

  private hasConfirmedPaymentForCurrentAccount(): boolean {
    const auth = this.authorization.getAuth()
    return Boolean(auth && this.confirmedOwnerId !== null && auth.user.id === this.confirmedOwnerId)
  }

  private nextGeneration(clientId: number): number {
    const generation = (this.generations.get(clientId) ?? 0) + 1
    this.generations.set(clientId, generation)
    return generation
  }
}
