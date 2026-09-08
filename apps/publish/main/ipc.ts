import type { TalkHeroResult } from '@apps/inference/types/public'
import { fileGrants } from '@apps/inference/main/file-grants'
import { authorizeProductClient } from '@apps/inference/main/ipc-security'
import { dialog, ipcMain } from 'electron'
import { PUBLISH_IPC } from '../types/ipc'
import type {
  GeneratedVideoSummary,
  PublishCapabilitySnapshot,
  PublishDraft,
  SelectedPublishVideo
} from '../types/public'
import {
  confirmPublishDraft,
  findGeneratedVideoTaskId,
  getPublishCapabilitySnapshot,
  listGeneratedVideos,
  listPublishDrafts,
  preparePublishDraft,
  removeInvalidGeneratedVideo,
  selectGeneratedVideo,
  updatePublishDraft
} from './service'
import {
  parseConfirmPublishDraftRequest,
  parsePreparePublishRequest,
  parseUpdatePublishDraftRequest
} from './contracts'

const clientId = (event: Electron.IpcMainInvokeEvent): number | null => {
  return authorizeProductClient(event)
}

const safeMessage = (error: unknown, fallback: string): string => {
  const message = error instanceof Error ? error.message : ''
  return !message || /[/\\]/u.test(message) ? fallback : message
}

ipcMain.removeHandler(PUBLISH_IPC.capability)
ipcMain.handle(
  PUBLISH_IPC.capability,
  (event, ...args: unknown[]): TalkHeroResult<PublishCapabilitySnapshot> => {
    if (authorizeProductClient(event) === null)
      return { ok: false, code: 'forbidden', message: '当前窗口无权访问发布能力' }
    if (args.length !== 0) return { ok: false, code: 'invalid-input', message: '请求参数无效' }
    return { ok: true, data: getPublishCapabilitySnapshot() }
  }
)

ipcMain.removeHandler(PUBLISH_IPC.listDrafts)
ipcMain.handle(
  PUBLISH_IPC.listDrafts,
  async (event, ...args: unknown[]): Promise<TalkHeroResult<PublishDraft[]>> => {
    if (clientId(event) === null)
      return { ok: false, code: 'forbidden', message: '当前窗口无权读取发布草稿' }
    if (args.length) return { ok: false, code: 'invalid-input', message: '请求参数无效' }
    try {
      return { ok: true, data: await listPublishDrafts() }
    } catch {
      return { ok: false, code: 'unavailable', message: '发布草稿读取失败' }
    }
  }
)

const registerDraftMutation = (
  channel: string,
  parse: (value: unknown) => Parameters<typeof updatePublishDraft>[0],
  mutate: typeof updatePublishDraft
): void => {
  ipcMain.removeHandler(channel)
  ipcMain.handle(
    channel,
    async (event, ...args: unknown[]): Promise<TalkHeroResult<PublishDraft>> => {
      if (clientId(event) === null)
        return { ok: false, code: 'forbidden', message: '当前窗口无权修改发布草稿' }
      try {
        if (args.length !== 1) throw new Error('发布草稿参数无效')
        return { ok: true, data: await mutate(parse(args[0])) }
      } catch (error) {
        return {
          ok: false,
          code: 'invalid-input',
          message: safeMessage(error, '发布草稿操作失败')
        }
      }
    }
  )
}

registerDraftMutation(PUBLISH_IPC.updateDraft, parseUpdatePublishDraftRequest, updatePublishDraft)

ipcMain.removeHandler(PUBLISH_IPC.confirmDraft)
ipcMain.handle(
  PUBLISH_IPC.confirmDraft,
  async (event, ...args: unknown[]): Promise<TalkHeroResult<PublishDraft>> => {
    if (clientId(event) === null)
      return { ok: false, code: 'forbidden', message: '当前窗口无权确认发布草稿' }
    try {
      if (args.length !== 1) throw new Error('发布确认参数无效')
      return { ok: true, data: await confirmPublishDraft(parseConfirmPublishDraftRequest(args[0])) }
    } catch (error) {
      return {
        ok: false,
        code: 'invalid-input',
        message: safeMessage(error, '发布确认失败')
      }
    }
  }
)

ipcMain.removeHandler(PUBLISH_IPC.selectVideo)
ipcMain.handle(
  PUBLISH_IPC.selectVideo,
  async (event, ...args: unknown[]): Promise<TalkHeroResult<SelectedPublishVideo | null>> => {
    const owner = clientId(event)
    if (owner === null) return { ok: false, code: 'forbidden', message: '当前窗口无权选择发布视频' }
    if (args.length) return { ok: false, code: 'invalid-input', message: '请求参数无效' }
    const selected = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: '生成视频', extensions: ['mp4'] }]
    })
    if (selected.canceled || selected.filePaths.length !== 1) return { ok: true, data: null }
    const taskId = await findGeneratedVideoTaskId(selected.filePaths[0])
    if (!taskId)
      return { ok: false, code: 'invalid-input', message: '只能选择 TalkHero 已完成的生成视频' }
    const grant = await fileGrants.issue(selected.filePaths[0], owner, 'publish-video')
    return {
      ok: true,
      data: {
        grantId: grant.id,
        taskId,
        displayName: grant.displayName,
        expiresAt: grant.expiresAt,
        previewUrl: `talkhero-media://video/${taskId}/output.mp4`
      }
    }
  }
)

ipcMain.removeHandler(PUBLISH_IPC.listGeneratedVideos)
ipcMain.handle(
  PUBLISH_IPC.listGeneratedVideos,
  async (event, ...args: unknown[]): Promise<TalkHeroResult<GeneratedVideoSummary[]>> => {
    if (clientId(event) === null)
      return { ok: false, code: 'forbidden', message: '当前窗口无权读取生成视频' }
    if (args.length) return { ok: false, code: 'invalid-input', message: '请求参数无效' }
    return { ok: true, data: await listGeneratedVideos() }
  }
)

ipcMain.removeHandler(PUBLISH_IPC.selectGeneratedVideo)
ipcMain.handle(
  PUBLISH_IPC.selectGeneratedVideo,
  async (event, ...args: unknown[]): Promise<TalkHeroResult<SelectedPublishVideo>> => {
    const owner = clientId(event)
    if (owner === null) return { ok: false, code: 'forbidden', message: '当前窗口无权选择生成视频' }
    if (args.length !== 1 || typeof args[0] !== 'string' || !/^[0-9a-f-]{36}$/iu.test(args[0]))
      return { ok: false, code: 'invalid-input', message: '生成任务 ID 无效' }
    try {
      return { ok: true, data: await selectGeneratedVideo(owner, args[0]) }
    } catch (error) {
      return { ok: false, code: 'unavailable', message: safeMessage(error, '生成视频不可用') }
    }
  }
)

ipcMain.removeHandler(PUBLISH_IPC.removeInvalidGeneratedVideo)
ipcMain.handle(
  PUBLISH_IPC.removeInvalidGeneratedVideo,
  async (event, ...args: unknown[]): Promise<TalkHeroResult<boolean>> => {
    if (clientId(event) === null)
      return { ok: false, code: 'forbidden', message: '当前窗口无权移除生成视频记录' }
    if (args.length !== 1 || typeof args[0] !== 'string' || !/^[0-9a-f-]{36}$/iu.test(args[0]))
      return { ok: false, code: 'invalid-input', message: '生成任务 ID 无效' }
    try {
      return { ok: true, data: await removeInvalidGeneratedVideo(args[0]) }
    } catch (error) {
      return { ok: false, code: 'unavailable', message: safeMessage(error, '移除失效记录失败') }
    }
  }
)

ipcMain.removeHandler(PUBLISH_IPC.prepare)
ipcMain.handle(
  PUBLISH_IPC.prepare,
  async (event, ...args: unknown[]): Promise<TalkHeroResult<PublishDraft>> => {
    const owner = clientId(event)
    if (owner === null) return { ok: false, code: 'forbidden', message: '当前窗口无权准备发布资料' }
    if (args.length !== 1) {
      return { ok: false, code: 'invalid-input', message: '发布资料参数无效' }
    }
    let input
    try {
      input = parsePreparePublishRequest(args[0])
    } catch (error) {
      return {
        ok: false,
        code: 'invalid-input',
        message: error instanceof Error ? error.message : '发布资料参数无效'
      }
    }
    try {
      return { ok: true, data: await preparePublishDraft(owner, input) }
    } catch (error) {
      return {
        ok: false,
        code: 'unavailable',
        message: safeMessage(error, '发布资料生成失败')
      }
    }
  }
)
