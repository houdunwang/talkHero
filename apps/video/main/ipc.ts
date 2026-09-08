import type { TalkHeroResult } from '@apps/inference/types/public'
import { fileGrants } from '@apps/inference/main/file-grants'
import { authorizeProductClient } from '@apps/inference/main/ipc-security'
import { dialog, ipcMain } from 'electron'
import { VIDEO_IPC } from '../types/ipc'
import type { SelectedVideoSource, VideoInspection, VideoWorkspaceSnapshot } from '../types/public'
import { getVideoWorkspaceSnapshot, inspectVideo } from './service'
import { parseInspectVideoRequest } from './contracts'

const clientId = (event: Electron.IpcMainInvokeEvent): number | null => {
  return authorizeProductClient(event)
}

ipcMain.removeHandler(VIDEO_IPC.workspace)
ipcMain.handle(
  VIDEO_IPC.workspace,
  (event, ...args: unknown[]): TalkHeroResult<VideoWorkspaceSnapshot> => {
    if (authorizeProductClient(event) === null)
      return { ok: false, code: 'forbidden', message: '当前窗口无权访问视频工作台' }
    if (args.length !== 0) return { ok: false, code: 'invalid-input', message: '请求参数无效' }
    return { ok: true, data: getVideoWorkspaceSnapshot() }
  }
)

ipcMain.removeHandler(VIDEO_IPC.selectSource)
ipcMain.handle(
  VIDEO_IPC.selectSource,
  async (event, ...args: unknown[]): Promise<TalkHeroResult<SelectedVideoSource | null>> => {
    const owner = clientId(event)
    if (owner === null) return { ok: false, code: 'forbidden', message: '当前窗口无权选择视频' }
    if (args.length) return { ok: false, code: 'invalid-input', message: '请求参数无效' }
    const selected = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: '视频', extensions: ['mp4', 'mov', 'mkv', 'webm'] }]
    })
    if (selected.canceled || selected.filePaths.length !== 1) return { ok: true, data: null }
    const grant = await fileGrants.issue(selected.filePaths[0], owner, 'video-source')
    return {
      ok: true,
      data: { grantId: grant.id, displayName: grant.displayName, expiresAt: grant.expiresAt }
    }
  }
)

ipcMain.removeHandler(VIDEO_IPC.inspect)
ipcMain.handle(
  VIDEO_IPC.inspect,
  async (event, ...args: unknown[]): Promise<TalkHeroResult<VideoInspection>> => {
    const owner = clientId(event)
    if (owner === null) return { ok: false, code: 'forbidden', message: '当前窗口无权质检视频' }
    if (args.length !== 1) {
      return { ok: false, code: 'invalid-input', message: '视频质检参数无效' }
    }
    let input
    try {
      input = parseInspectVideoRequest(args[0])
    } catch (error) {
      return {
        ok: false,
        code: 'invalid-input',
        message: error instanceof Error ? error.message : '视频质检参数无效'
      }
    }
    try {
      return { ok: true, data: await inspectVideo(owner, input) }
    } catch (error) {
      return {
        ok: false,
        code: 'unavailable',
        message: error instanceof Error ? error.message : '视频质检失败'
      }
    }
  }
)
