import type { ComputeMode, TaskState } from '../main/contracts'

export type TalkHeroFailure = {
  ok: false
  code: 'forbidden' | 'invalid-input' | 'unavailable' | 'internal'
  message: string
}
export type TalkHeroResult<T> = { ok: true; data: T } | TalkHeroFailure

export type ManagedResourceName =
  'python' | 'cosyvoice2' | 'muse-talk' | 'asr' | 'ffmpeg' | 'browser'
export type ManagedResourceStatus = {
  name: ManagedResourceName
  installed: boolean
  version: string | null
  sizeBytes: number
  licenseName: string | null
  licenseUrl: string | null
  installable: boolean
}
export type ResourceInstallSnapshot = {
  state: 'unavailable' | 'idle' | 'running' | 'completed' | 'failed' | 'cancelled'
  currentResource: ManagedResourceName | null
  completedBytes: number
  totalBytes: number
  message: string
}
export type TaskSummary = {
  id: string
  operation: string
  state: TaskState
  stage: string
  progress: number
}

export type EnvironmentSnapshot = {
  platform: NodeJS.Platform
  targetPlatform: boolean
  gpu: { detected: boolean; name: string | null; vramGb: number | null; cuda: boolean }
  computeMode: ComputeMode
  worker: { installed: boolean; protocolVersion: string; running: boolean }
  resources: ManagedResourceStatus[]
  resourceInstall: ResourceInstallSnapshot
  message: string
}
