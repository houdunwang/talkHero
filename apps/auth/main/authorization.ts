import type { AuthResult, AuthSnapshot } from '../types/public'
import {
  createSnapshot,
  parseSoft,
  parseSoftEnvelope,
  parseStoredAuth,
  parseUserEnvelope
} from './contracts'

export type AuthRequestOptions = {
  url: string
  method: 'GET' | 'POST'
  data?: unknown
  authToken?: string
  redirectOnUnauthorized?: boolean
}

export type AuthRequestResult = {
  ok: boolean
  status: number
  data: unknown
  error?: string
}

export type AuthFlowDependencies = {
  request: (options: AuthRequestOptions) => Promise<AuthRequestResult>
  store: {
    get: (key: string) => unknown
    set: (key: string, value: unknown) => void
  }
  packageName: string
  now?: () => number
}

export type AccessStatus = 'logged-out' | 'active' | 'inactive'

type FailureCode =
  | 'invalid-response'
  | 'network'
  | 'unauthorized'
  | 'expired'
  | 'no-session'
  | 'not-ready'
  | 'payment-confirmed'

export const success = <T>(data: T): AuthResult<T> => ({ ok: true, data })

export const failure = (code: FailureCode, message: string): AuthResult<never> => ({
  ok: false,
  code,
  message
})

// 授权状态集中处理受信网络请求、当前 store 解析和认证数据刷新。
export class AuthorizationState {
  constructor(private readonly dependencies: AuthFlowDependencies) {}

  getSnapshot(): AuthSnapshot {
    return createSnapshot(this.getAuth(), parseSoft(this.dependencies.store.get('soft')))
  }

  getAuth(): Auth | null {
    return parseStoredAuth(this.dependencies.store.get('auth'))
  }

  async getWebsiteAccessStatus(forceRefresh = false): Promise<AccessStatus> {
    if (!forceRefresh) return this.getStoredAccessStatus()
    return this.refreshAuthorizationData()
  }

  async refreshSoftware(authToken?: string): Promise<AuthResult<Soft>> {
    const currentAuth = authToken ? null : this.getAuth()
    if (!authToken && !currentAuth) return failure('unauthorized', '登录状态已失效')

    const refreshed = await this.fetchSoftware(authToken ?? currentAuth?.token)
    if (currentAuth && this.getAuth()?.token !== currentAuth.token) {
      return failure('no-session', '认证状态已变更')
    }
    if (!refreshed.ok) {
      if (refreshed.code === 'unauthorized') this.clearAuthorization()
      return refreshed
    }
    this.dependencies.store.set('soft', refreshed.data)
    return refreshed
  }

  persistAuthentication(auth: Auth, soft: Soft): void {
    this.dependencies.store.set('auth', auth)
    this.dependencies.store.set('soft', soft)
  }

  clearAuthorization(): void {
    this.dependencies.store.set('auth', null)
    this.dependencies.store.set('soft', null)
  }

  async revokeCurrentToken(): Promise<AuthResult<true>> {
    const auth = this.getAuth()
    if (!auth) return failure('unauthorized', '登录状态已失效')

    const response = await this.safeRequest({
      url: '/core/logout',
      method: 'POST',
      authToken: auth.token,
      redirectOnUnauthorized: false
    })
    if (response.ok || response.status === 401) return success(true)
    return failure('network', response.error || '退出登录失败，请稍后重试')
  }

  async safeRequest(options: AuthRequestOptions): Promise<AuthRequestResult> {
    try {
      return await this.dependencies.request(options)
    } catch {
      return { ok: false, status: 0, data: null }
    }
  }

  requestFailure(response: AuthRequestResult, fallback: string): AuthResult<never> {
    if (response.status === 401) {
      this.clearAuthorization()
      return failure('unauthorized', '登录状态已失效')
    }
    return failure('network', response.error || fallback)
  }

  private getStoredAccessStatus(): AccessStatus {
    if (!this.getAuth()) return 'logged-out'
    const soft = parseSoft(this.dependencies.store.get('soft'))
    return soft?.canUse === true ? 'active' : 'inactive'
  }

  private async refreshAuthorizationData(): Promise<AccessStatus> {
    const auth = this.getAuth()
    if (!auth) return 'logged-out'

    const [profileResponse, softResponse] = await Promise.all([
      this.safeRequest({ url: '/core/users/profile', method: 'GET' }),
      this.safeRequest({
        url: this.getSoftwareUrl(),
        method: 'GET'
      })
    ])

    if (this.getAuth()?.token !== auth.token) return this.getStoredAccessStatus()

    if (profileResponse.status === 401 || softResponse.status === 401) {
      this.clearAuthorization()
      return 'logged-out'
    }

    if (profileResponse.ok) {
      const user = parseUserEnvelope(profileResponse.data)
      if (user) this.dependencies.store.set('auth', { ...auth, user })
    }
    if (softResponse.ok) {
      const soft = parseSoftEnvelope(softResponse.data)
      if (soft) this.dependencies.store.set('soft', soft)
    }
    return this.getStoredAccessStatus()
  }

  async fetchSoftware(authToken?: string): Promise<AuthResult<Soft>> {
    const response = await this.safeRequest({
      url: this.getSoftwareUrl(),
      method: 'GET',
      authToken
    })
    if (response.status === 401) {
      return failure('unauthorized', '登录状态已失效')
    }
    if (!response.ok) return this.requestFailure(response, '获取软件订阅信息失败')
    const soft = parseSoftEnvelope(response.data)
    if (!soft) return failure('invalid-response', '服务返回了无效的软件订阅信息')
    return success(soft)
  }

  private getSoftwareUrl(): string {
    return `/soft/softs/by-name/${encodeURIComponent(this.dependencies.packageName)}`
  }
}
