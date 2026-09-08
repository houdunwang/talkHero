import { contextBridge, ipcRenderer } from 'electron'
import type { TalkHeroResult } from '@apps/inference/types/public'
import { PUBLISH_IPC } from '../types/ipc'
import type { PublishCapabilitySnapshot } from '../types/public'
import type {
  ConfirmPublishDraftRequest,
  GeneratedVideoSummary,
  PreparePublishRequest,
  PublishDraft,
  SelectedPublishVideo,
  UpdatePublishDraftRequest
} from '../types/public'

export const publishPreload = {
  getCapability: () =>
    ipcRenderer.invoke(PUBLISH_IPC.capability) as Promise<
      TalkHeroResult<PublishCapabilitySnapshot>
    >,
  selectVideo: () =>
    ipcRenderer.invoke(PUBLISH_IPC.selectVideo) as Promise<
      TalkHeroResult<SelectedPublishVideo | null>
    >,
  listGeneratedVideos: () =>
    ipcRenderer.invoke(PUBLISH_IPC.listGeneratedVideos) as Promise<
      TalkHeroResult<GeneratedVideoSummary[]>
    >,
  selectGeneratedVideo: (taskId: string) =>
    ipcRenderer.invoke(PUBLISH_IPC.selectGeneratedVideo, taskId) as Promise<
      TalkHeroResult<SelectedPublishVideo>
    >,
  removeInvalidGeneratedVideo: (taskId: string) =>
    ipcRenderer.invoke(PUBLISH_IPC.removeInvalidGeneratedVideo, taskId) as Promise<
      TalkHeroResult<boolean>
    >,
  prepare: (input: PreparePublishRequest) =>
    ipcRenderer.invoke(PUBLISH_IPC.prepare, input) as Promise<TalkHeroResult<PublishDraft>>,
  listDrafts: () =>
    ipcRenderer.invoke(PUBLISH_IPC.listDrafts) as Promise<TalkHeroResult<PublishDraft[]>>,
  updateDraft: (input: UpdatePublishDraftRequest) =>
    ipcRenderer.invoke(PUBLISH_IPC.updateDraft, input) as Promise<TalkHeroResult<PublishDraft>>,
  confirmDraft: (input: ConfirmPublishDraftRequest) =>
    ipcRenderer.invoke(PUBLISH_IPC.confirmDraft, input) as Promise<TalkHeroResult<PublishDraft>>
}

contextBridge.exposeInMainWorld('publish', publishPreload)
