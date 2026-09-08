export type VideoWorkspaceSnapshot = {
  maxDurationSeconds: 180
  lipModel: 'muse-talk-1.5'
  internalFaceSize: 256
  audioPolicies: readonly ['mix', 'replace']
  readyJobs: number
}

export type SelectedVideoSource = { grantId: string; displayName: string; expiresAt: number }
export type InspectVideoRequest = { grantId: string; authorized: boolean }
export type VideoInspection = {
  taskId: string
  durationSeconds: number
  width: number
  height: number
  codec: string
  usable: false
  reason: string
}
