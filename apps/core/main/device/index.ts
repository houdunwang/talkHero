import { configStore } from '@apps/core/main/config'
import { randomUUID } from 'node:crypto'

let cachedMachineCode: string | null = null
const INSTALL_ID_KEY = 'installId'

// 每次安装生成一个稳定的本地标识，避免受网卡变化影响。
function getOrCreateInstallId() {
  const storedInstallId = configStore.get(INSTALL_ID_KEY)
  if (typeof storedInstallId === 'string' && storedInstallId) {
    return storedInstallId
  }

  const installId = randomUUID().toUpperCase()
  configStore.set(INSTALL_ID_KEY, installId)
  return installId
}

export function getMachineCode() {
  if (cachedMachineCode) {
    return cachedMachineCode
  }

  cachedMachineCode = getOrCreateInstallId()
  return cachedMachineCode
}
