export type VoiceProfileSummary = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  revisionId: string
  modelVersion: 'cosyvoice2-0.5b'
}
export type VoiceLibrarySnapshot = {
  profiles: VoiceProfileSummary[]
  available: boolean
  message: string
}

export type SelectedVoiceReference = { grantId: string; displayName: string; expiresAt: number }
export type CreateVoiceRequest = { grantId: string; name: string; authorized: boolean }
export type RenameVoiceRequest = { profileId: string; name: string }
export type UpdateVoiceRequest = {
  profileId: string
  grantId: string
  name: string
  authorized: boolean
}
export type SynthesizeVoiceRequest = {
  profileId: string
  text: string
  speed: number
  emotion: 'natural'
}
export type GeneratedAudio = { taskId: string; previewUrl: string }
export type VoicePreview = { profileId: string; previewUrl: string }
