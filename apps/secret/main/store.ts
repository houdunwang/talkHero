import { configStore } from '@apps/core/main/config'
import { CreateStore } from '@apps/core/main/store/CreateStore'
import { SECRET_STORE_NAME } from '@apps/secret/config/defaults'

const SECRET_KEY = 'secret'

export const secretStore = new CreateStore(SECRET_STORE_NAME)

// 从旧版 core 配置无损迁移；授权码不通过通用 config bridge 暴露给渲染层。
if (!secretStore.has(SECRET_KEY)) {
  const legacySecret = configStore.get(SECRET_KEY)
  secretStore.set(SECRET_KEY, typeof legacySecret === 'string' ? legacySecret : '')
}
configStore.remove(SECRET_KEY)

export const getLicenseSecret = () => {
  const secret = secretStore.get(SECRET_KEY)
  return typeof secret === 'string' ? secret : ''
}

export const hasLicenseSecret = () => Boolean(getLicenseSecret())

export const setLicenseSecret = (secret: string) => {
  secretStore.set(SECRET_KEY, secret)
}

export const clearLicenseSecret = () => {
  secretStore.set(SECRET_KEY, '')
}

export const onLicenseSecretChange = (callback: () => void): (() => void) =>
  secretStore.onDidChange(SECRET_KEY, callback)
