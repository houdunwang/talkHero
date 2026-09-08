import type { PublishPlatform } from '../main/contracts'
import type { PublishState } from '../main/contracts'

export type PublishCapabilitySnapshot = {
  platforms: Array<{ id: PublishPlatform; name: string; officialHost: string }>
  requiresExplicitConfirmation: true
  silentPublish: false
  message: string
}

export type SelectedPublishVideo = {
  grantId: string
  taskId: string
  displayName: string
  expiresAt: number
  previewUrl: string
}
export type GeneratedVideoSummary = {
  taskId: string
  displayName: string
  previewUrl: string | null
  available: boolean
  unavailableReason: string | null
}
export type PreparePublishRequest = { taskId: string; videoGrantId: string; script: string }
export type UpdatePublishDraftRequest = {
  id: string
  revision: number
  title: string
  description: string
  topics: string[]
  selectedCoverId: string
  platform: PublishPlatform | null
}
export type ConfirmPublishDraftRequest = { id: string; revision: number }
export type PublishDraft = {
  id: string
  taskId: string
  title: string
  description: string
  topics: string[]
  covers: Array<{ id: string; previewUrl: string; recommended: boolean }>
  selectedCoverId: string
  platform: PublishPlatform | null
  revision: number
  state: PublishState
  confirmed: boolean
}
