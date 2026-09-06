/** 更新模块 IPC 频道名称常量 — 统一管理，避免多处定义导致修改时脱节 */
export const UPDATER_CHANNELS = {
  STATE_CHANGED: 'updater:state-changed',
  GET_STATE: 'updater:getState',
  CHECK_FOR_UPDATES: 'updater:checkForUpdates',
  INSTALL_UPDATE: 'updater:installUpdate'
} as const

type UpdaterStatus =
  'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'not-available' | 'error'
export interface UpdaterState {
  status: UpdaterStatus
  availableVersion: string | null
  downloadProgress: number | null
  canInstallUpdate: boolean
  currentVersion: string | null
  message: string
  lastCheckedAt: number | null
  releaseDate: string | null
}
