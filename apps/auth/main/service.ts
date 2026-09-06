import { sendRequest } from '@apps/core/main/request'
import { name as packageName } from '../../../package.json'
import type { AccessStatus } from './authorization'
import { AuthFlow } from './flow'
import { authConfigStore } from './store'

export const authFlow = new AuthFlow({
  request: ({ authToken, ...options }) =>
    sendRequest({
      ...options,
      headers: authToken ? { authorization: `Bearer ${authToken}` } : undefined
    }),
  store: authConfigStore,
  packageName
})

// 默认只读取本地授权；仅启动流程传入 true 时才请求官网。
export const getWebsiteAccessStatus = (forceRefresh = false): Promise<AccessStatus> =>
  authFlow.getWebsiteAccessStatus(forceRefresh)
