import env from '@config/request'

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

type RequestResponseType = 'auto' | 'json' | 'text' | 'arrayBuffer'

export interface MainRequestOptions {
  url: string
  method?: RequestMethod
  baseURL?: string
  params?: Record<string, string | number | boolean | null | undefined>
  headers?: Record<string, string>
  data?: unknown
  timeout?: number
  responseType?: RequestResponseType
  redirectOnUnauthorized?: boolean
}

export interface MainRequestResult<T = unknown> {
  ok: boolean
  status: number
  statusText: string
  url: string
  headers: Record<string, string>
  data: T
  error?: string
}

let unauthorizedRedirect: Promise<void> | null = null

type AuthStoreData = { token?: unknown }

async function redirectToLogin(): Promise<void> {
  if (unauthorizedRedirect) {
    return unauthorizedRedirect
  }

  unauthorizedRedirect = (async () => {
    const { closeWindows } = await import('../window/functions')
    await closeWindows(['login'])
  })().finally(() => {
    unauthorizedRedirect = null
  })

  return unauthorizedRedirect
}

function buildRequestUrl(
  url: string,
  baseURL?: string,
  params?: Record<string, string | number | boolean | null | undefined>
): URL {
  const isAbsoluteUrl = /^[a-z][a-z\d+\-.]*:/i.test(url)
  const requestUrl = isAbsoluteUrl ? new URL(url) : new URL(baseURL || env.baseUrl)

  if (!isAbsoluteUrl) {
    const basePath = requestUrl.pathname.replace(/\/+$/, '')
    const requestPath = url.replace(/^\/+/, '')
    requestUrl.pathname = requestPath ? `${basePath}/${requestPath}` : basePath || '/'
  }

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return
    }

    requestUrl.searchParams.append(key, String(value))
  })

  return requestUrl
}

function headersToObject(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {}

  headers.forEach((value, key) => {
    result[key] = value
  })

  return result
}

async function addAuthHeader(headers: Headers, requestUrl: URL): Promise<void> {
  // 令牌只随请求发送给配置的 API，避免自定义绝对地址意外获得用户凭据。
  if (headers.has('authorization') || requestUrl.origin !== new URL(env.baseUrl).origin) {
    return
  }

  const { authConfigStore } = await import('@apps/auth/main/store')
  const authData = authConfigStore.get('auth') as AuthStoreData | null
  const token = typeof authData?.token === 'string' ? authData.token.trim() : ''

  if (token) {
    headers.set('authorization', `Bearer ${token}`)
  }
}

function formatErrorDetail(value: unknown): string {
  if (value instanceof Error) {
    const errorWithCode = value as Error & { code?: string }

    return JSON.stringify({
      name: value.name,
      message: value.message,
      code: errorWithCode.code,
      stack: value.stack
    })
  }

  if (typeof value === 'object' && value !== null) {
    try {
      return JSON.stringify(value, Object.getOwnPropertyNames(value))
    } catch {
      return String(value)
    }
  }

  return String(value)
}

function createRequestBody(data: unknown, headers: Headers): BodyInit | undefined {
  if (data === null || data === undefined) {
    return undefined
  }

  if (
    typeof data === 'string' ||
    data instanceof Blob ||
    data instanceof ArrayBuffer ||
    data instanceof URLSearchParams ||
    data instanceof FormData
  ) {
    return data
  }

  if (ArrayBuffer.isView(data)) {
    return Uint8Array.from(data as unknown as ArrayLike<number>) as BodyInit
  }

  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }

  return JSON.stringify(data)
}

async function parseResponseData(
  response: Response,
  responseType: RequestResponseType
): Promise<unknown> {
  if (responseType === 'text') {
    return response.text()
  }

  if (responseType === 'arrayBuffer') {
    return response.arrayBuffer()
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() || ''
  const shouldParseJson = responseType === 'json' || contentType.includes('application/json')

  if (shouldParseJson) {
    try {
      return await response.json()
    } catch {
      return null
    }
  }

  return response.text()
}

export async function sendRequest<T = unknown>(
  options: MainRequestOptions
): Promise<MainRequestResult<T>> {
  const {
    url,
    method = 'GET',
    baseURL,
    params,
    headers = {},
    data,
    timeout = 10000,
    responseType = 'auto',
    redirectOnUnauthorized = true
  } = options

  const requestUrl = buildRequestUrl(url, baseURL, params)
  const requestHeaders = new Headers(headers)
  await addAuthHeader(requestHeaders, requestUrl)
  const shouldSendBody = !['GET', 'HEAD'].includes(method.toUpperCase())
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(requestUrl, {
      method,
      headers: requestHeaders,
      body: shouldSendBody ? createRequestBody(data, requestHeaders) : undefined,
      signal: controller.signal
    })
    const responseHeaders = headersToObject(response.headers)
    const responseData = (await parseResponseData(response, responseType)) as T

    const ok = response.status >= 200 && response.status < 300
    if (!ok) {
      console.error(
        `[request] 请求失败 ${method} ${requestUrl.toString()} → ${response.status} ${response.statusText}`
      )
      if (response.status === 401 && redirectOnUnauthorized) {
        await redirectToLogin()
      }
    }

    return {
      ok,
      status: response.status,
      statusText: response.statusText,
      url: response.url || requestUrl.toString(),
      headers: responseHeaders,
      data: responseData
    }
  } catch (err) {
    const error = err as Error & { cause?: unknown; code?: string }
    const isTimeout = error.name === 'AbortError'
    const message = isTimeout ? `请求超时，超过 ${timeout}ms` : error.message
    const causeDetail = error.cause ? formatErrorDetail(error.cause) : ''
    const errorDetail = formatErrorDetail(error)

    console.error(`[request] 网络错误 ${method} ${requestUrl.toString()}: ${message}`)
    console.error(`[request] 错误详情: ${errorDetail}`)
    if (causeDetail) {
      console.error(`[request] cause: ${causeDetail}`)
    }

    return {
      ok: false,
      status: 0,
      statusText: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
      url: requestUrl.toString(),
      headers: {},
      data: null as unknown as T,
      error: message
    }
  } finally {
    clearTimeout(timeoutId)
  }
}
