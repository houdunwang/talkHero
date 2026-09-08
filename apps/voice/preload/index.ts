import { contextBridge, ipcRenderer } from 'electron'
import type { TalkHeroResult } from '@apps/inference/types/public'
import { VOICE_IPC } from '../types/ipc'
import type {
  CreateVoiceRequest,
  GeneratedAudio,
  RenameVoiceRequest,
  SelectedVoiceReference,
  SynthesizeVoiceRequest,
  UpdateVoiceRequest,
  VoiceLibrarySnapshot,
  VoicePreview,
  VoiceProfileSummary
} from '../types/public'

export const voicePreload = {
  getLibrary: () =>
    ipcRenderer.invoke(VOICE_IPC.library) as Promise<TalkHeroResult<VoiceLibrarySnapshot>>,
  selectReference: () =>
    ipcRenderer.invoke(VOICE_IPC.selectReference) as Promise<
      TalkHeroResult<SelectedVoiceReference | null>
    >,
  createProfile: (input: CreateVoiceRequest) =>
    ipcRenderer.invoke(VOICE_IPC.createProfile, input) as Promise<
      TalkHeroResult<VoiceProfileSummary>
    >,
  synthesize: (input: SynthesizeVoiceRequest) =>
    ipcRenderer.invoke(VOICE_IPC.synthesize, input) as Promise<TalkHeroResult<GeneratedAudio>>,
  deleteProfile: (profileId: string) =>
    ipcRenderer.invoke(VOICE_IPC.deleteProfile, profileId) as Promise<TalkHeroResult<boolean>>,
  renameProfile: (input: RenameVoiceRequest) =>
    ipcRenderer.invoke(VOICE_IPC.renameProfile, input) as Promise<
      TalkHeroResult<VoiceProfileSummary>
    >,
  updateProfile: (input: UpdateVoiceRequest) =>
    ipcRenderer.invoke(VOICE_IPC.updateProfile, input) as Promise<
      TalkHeroResult<VoiceProfileSummary>
    >,
  previewProfile: (profileId: string) =>
    ipcRenderer.invoke(VOICE_IPC.previewProfile, profileId) as Promise<TalkHeroResult<VoicePreview>>
}

contextBridge.exposeInMainWorld('voice', voicePreload)
