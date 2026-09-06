import type { AuthResult, LoginCheck, LoginQr } from '../types/public'
import { parseLoginQrResponse, parseLoginResponse } from './contracts'
import { AuthorizationState, failure, success } from './authorization'

type LoginSession = {
  ticket: string
  expiresAt: number
  lastCheckAt: number
  checkPromise?: Promise<AuthResult<LoginCheck>>
}

const MIN_CHECK_INTERVAL = 2_500

// 登录会话负责二维码创建、查询限频以及旧会话结果失效。
export class LoginFlow {
  private readonly generations = new Map<number, number>()
  private readonly sessions = new Map<number, LoginSession>()
  private readonly createPromises = new Map<number, Promise<AuthResult<LoginQr>>>()

  constructor(
    private readonly authorization: AuthorizationState,
    private readonly now: () => number,
    private readonly onAuthenticated: (userId: number) => void
  ) {}

  createQr(clientId: number): Promise<AuthResult<LoginQr>> {
    const existing = this.createPromises.get(clientId)
    if (existing) return existing

    const promise = this.performCreateQr(clientId)
    this.createPromises.set(clientId, promise)
    return promise.finally(() => {
      if (this.createPromises.get(clientId) === promise) this.createPromises.delete(clientId)
    })
  }

  async check(clientId: number): Promise<AuthResult<LoginCheck>> {
    const session = this.sessions.get(clientId)
    if (!session) return failure('no-session', '登录会话不存在或已结束')
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

  cancel(clientId: number): void {
    this.nextGeneration(clientId)
    this.sessions.delete(clientId)
    this.createPromises.delete(clientId)
  }

  reset(): void {
    const clientIds = new Set([
      ...this.generations.keys(),
      ...this.sessions.keys(),
      ...this.createPromises.keys()
    ])
    clientIds.forEach((clientId) => this.nextGeneration(clientId))
    this.sessions.clear()
    this.createPromises.clear()
  }

  private async performCreateQr(clientId: number): Promise<AuthResult<LoginQr>> {
    const generation = this.nextGeneration(clientId)
    this.sessions.delete(clientId)
    const response = await this.authorization.safeRequest({
      url: '/core/wechat/createQr',
      method: 'POST',
      data: { scene_str: 'login' }
    })
    if (this.generations.get(clientId) !== generation) {
      return failure('no-session', '登录会话已替换')
    }
    if (!response.ok) return this.authorization.requestFailure(response, '获取登录二维码失败')

    const qr = parseLoginQrResponse(response.data)
    if (!qr) return failure('invalid-response', '服务未返回有效的微信登录二维码')

    const expiresAt = this.now() + qr.expireSeconds * 1000
    this.sessions.set(clientId, { ticket: qr.ticket, expiresAt, lastCheckAt: 0 })
    return success({ qrImg: qr.qrImg, expiresAt })
  }

  private async performCheck(
    clientId: number,
    session: LoginSession
  ): Promise<AuthResult<LoginCheck>> {
    const response = await this.authorization.safeRequest({
      url: '/core/wechat/app/login',
      method: 'POST',
      data: { ticket: session.ticket }
    })
    if (this.sessions.get(clientId) !== session) {
      return failure('no-session', '登录会话已结束')
    }
    if (!response.ok) return this.authorization.requestFailure(response, '登录状态查询失败')

    const parsed = parseLoginResponse(response.data)
    if (!parsed) return failure('invalid-response', '服务返回了无效的登录结果')
    if (parsed.status === 'pending') return success({ status: 'pending' })

    const refreshed = await this.authorization.fetchSoftware(parsed.auth.token)
    if (this.sessions.get(clientId) !== session) {
      return failure('no-session', '登录会话已结束')
    }
    if (!refreshed.ok) {
      if (refreshed.code === 'unauthorized') this.authorization.clearAuthorization()
      return refreshed
    }

    this.onAuthenticated(parsed.auth.user.id)
    this.authorization.persistAuthentication(parsed.auth, refreshed.data)
    this.sessions.delete(clientId)
    return success({ status: 'authenticated', snapshot: this.authorization.getSnapshot() })
  }

  private nextGeneration(clientId: number): number {
    const generation = (this.generations.get(clientId) ?? 0) + 1
    this.generations.set(clientId, generation)
    return generation
  }
}
