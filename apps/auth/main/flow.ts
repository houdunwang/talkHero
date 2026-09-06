import type {
  AuthResult,
  AuthSnapshot,
  LoginCheck,
  LoginQr,
  PaymentCheck,
  PaymentQr,
  PaymentState,
  PurchaseOptions,
  SubscriptionPeriod
} from '../types/public'
import { AuthorizationState, type AccessStatus, type AuthFlowDependencies } from './authorization'
import { LoginFlow } from './login-flow'
import { PaymentFlow } from './payment-flow'

export type { AuthFlowDependencies, AuthRequestOptions, AuthRequestResult } from './authorization'

// 对外保持单一 auth flow 接口，内部按授权、登录会话和支付会话拆分职责。
export class AuthFlow {
  private readonly authorization: AuthorizationState
  private readonly login: LoginFlow
  private readonly payment: PaymentFlow
  private validationPromise: Promise<AccessStatus> | null = null
  private logoutPromise: Promise<AuthResult<AuthSnapshot>> | null = null

  constructor(dependencies: AuthFlowDependencies) {
    const now = dependencies.now ?? Date.now
    this.authorization = new AuthorizationState(dependencies)
    this.payment = new PaymentFlow(this.authorization, now)
    this.login = new LoginFlow(this.authorization, now, (userId) =>
      this.payment.reconcileConfirmedOwner(userId)
    )
  }

  getSnapshot(): AuthSnapshot {
    return this.authorization.getSnapshot()
  }

  logout(): Promise<AuthResult<AuthSnapshot>> {
    if (this.logoutPromise) return this.logoutPromise

    const promise = this.performLogout().finally(() => {
      if (this.logoutPromise === promise) this.logoutPromise = null
    })
    this.logoutPromise = promise
    return promise
  }

  async getWebsiteAccessStatus(forceRefresh = false): Promise<AccessStatus> {
    if (!forceRefresh) return this.authorization.getWebsiteAccessStatus()
    if (!this.validationPromise) {
      this.validationPromise = this.authorization.getWebsiteAccessStatus(true).finally(() => {
        this.validationPromise = null
      })
    }
    return this.validationPromise
  }

  createLoginQr(clientId: number): Promise<AuthResult<LoginQr>> {
    return this.login.createQr(clientId)
  }

  checkLogin(clientId: number): Promise<AuthResult<LoginCheck>> {
    return this.login.check(clientId)
  }

  cancelLogin(clientId: number): void {
    this.login.cancel(clientId)
  }

  getPaymentState(): PaymentState {
    return this.payment.getState()
  }

  getPurchaseOptions(clientId: number): Promise<AuthResult<PurchaseOptions>> {
    return this.payment.getPurchaseOptions(clientId)
  }

  createPayment(clientId: number, period: SubscriptionPeriod): Promise<AuthResult<PaymentQr>> {
    return this.payment.create(clientId, period)
  }

  checkPayment(clientId: number): Promise<AuthResult<PaymentCheck>> {
    return this.payment.check(clientId)
  }

  syncPayment(clientId: number): Promise<AuthResult<PaymentCheck>> {
    return this.payment.sync(clientId)
  }

  cancelPayment(clientId: number): void {
    this.payment.cancel(clientId)
  }

  disposeClient(clientId: number): void {
    this.login.cancel(clientId)
    this.payment.disposeClient(clientId)
  }

  private async performLogout(): Promise<AuthResult<AuthSnapshot>> {
    const revoked = await this.authorization.revokeCurrentToken()
    if (!revoked.ok) return revoked

    this.login.reset()
    this.payment.reset()
    this.authorization.clearAuthorization()
    return { ok: true, data: this.authorization.getSnapshot() }
  }
}
