import { contextBridge, ipcRenderer } from 'electron'
import type { TalkHeroResult } from '@apps/inference/types/public'
import { VIDEO_IPC } from '../types/ipc'
import type { VideoWorkspaceSnapshot } from '../types/public'
import type { InspectVideoRequest, SelectedVideoSource, VideoInspection } from '../types/public'

export const videoPreload = {
  getWorkspace: () =>
    ipcRenderer.invoke(VIDEO_IPC.workspace) as Promise<TalkHeroResult<VideoWorkspaceSnapshot>>,
  selectSource: () =>
    ipcRenderer.invoke(VIDEO_IPC.selectSource) as Promise<
      TalkHeroResult<SelectedVideoSource | null>
    >,
  inspect: (input: InspectVideoRequest) =>
    ipcRenderer.invoke(VIDEO_IPC.inspect, input) as Promise<TalkHeroResult<VideoInspection>>
}

contextBridge.exposeInMainWorld('video', videoPreload)
