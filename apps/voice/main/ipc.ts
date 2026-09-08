import type { TalkHeroResult } from '@apps/inference/types/public'
import { fileGrants } from '@apps/inference/main/file-grants'
import { authorizeTalkHeroClient } from '@apps/inference/main/ipc-security'
import { dialog, ipcMain } from 'electron'
import { VOICE_IPC } from '../types/ipc'
import type {
  GeneratedAudio,
  SelectedVoiceReference,
  VoiceLibrarySnapshot,
  VoicePreview,
  VoiceProfileSummary
} from '../types/public'
import {
  createVoiceProfile,
  deleteVoiceProfile,
  getVoicePreview,
  getVoiceLibrarySnapshot,
  renameVoiceProfile,
  synthesizeVoice,
  updateVoiceProfile
} from './service'
import {
  parseCreateVoiceRequest,
  parseRenameVoiceRequest,
  parseSynthesizeVoiceRequest,
  parseUpdateVoiceRequest
} from './contracts'

const failure = (error: unknown): TalkHeroResult<never> => {
  const message = error instanceof Error ? error.message : ''
  return {
    ok: false,
    code: 'unavailable',
    message: !message || /[/\\]/u.test(message) ? '本地音色操作失败' : message
  }
}

ipcMain.removeHandler(VOICE_IPC.library)
ipcMain.handle(
  VOICE_IPC.library,
  async (event, ...args: unknown[]): Promise<TalkHeroResult<VoiceLibrarySnapshot>> => {
    if (authorizeTalkHeroClient(event) === null)
      return { ok: false, code: 'forbidden', message: '当前窗口无权访问音色库' }
    if (args.length !== 0) return { ok: false, code: 'invalid-input', message: '请求参数无效' }
    return { ok: true, data: await getVoiceLibrarySnapshot() }
  }
)

ipcMain.removeHandler(VOICE_IPC.renameProfile)
ipcMain.handle(
  VOICE_IPC.renameProfile,
  async (event, ...args: unknown[]): Promise<TalkHeroResult<VoiceProfileSummary>> => {
    if (authorizeTalkHeroClient(event) === null)
      return { ok: false, code: 'forbidden', message: '当前窗口无权重命名音色' }
    try {
      if (args.length !== 1) throw new Error('音色重命名参数无效')
      return { ok: true, data: await renameVoiceProfile(parseRenameVoiceRequest(args[0])) }
    } catch (error) {
      return failure(error)
    }
  }
)

ipcMain.removeHandler(VOICE_IPC.updateProfile)
ipcMain.handle(
  VOICE_IPC.updateProfile,
  async (event, ...args: unknown[]): Promise<TalkHeroResult<VoiceProfileSummary>> => {
    const clientId = authorizeTalkHeroClient(event)
    if (clientId === null) return { ok: false, code: 'forbidden', message: '当前窗口无权更新音色' }
    try {
      if (args.length !== 1) throw new Error('音色更新参数无效')
      return {
        ok: true,
        data: await updateVoiceProfile(clientId, parseUpdateVoiceRequest(args[0]))
      }
    } catch (error) {
      return failure(error)
    }
  }
)

ipcMain.removeHandler(VOICE_IPC.previewProfile)
ipcMain.handle(
  VOICE_IPC.previewProfile,
  async (event, ...args: unknown[]): Promise<TalkHeroResult<VoicePreview>> => {
    if (authorizeTalkHeroClient(event) === null)
      return { ok: false, code: 'forbidden', message: '当前窗口无权试听音色' }
    if (args.length !== 1 || typeof args[0] !== 'string')
      return { ok: false, code: 'invalid-input', message: '音色 ID 无效' }
    try {
      return { ok: true, data: await getVoicePreview(args[0]) }
    } catch (error) {
      return failure(error)
    }
  }
)

ipcMain.removeHandler(VOICE_IPC.selectReference)
ipcMain.handle(
  VOICE_IPC.selectReference,
  async (event, ...args: unknown[]): Promise<TalkHeroResult<SelectedVoiceReference | null>> => {
    const clientId = authorizeTalkHeroClient(event)
    if (clientId === null) return { ok: false, code: 'forbidden', message: '当前窗口无权选择素材' }
    if (args.length !== 0) return { ok: false, code: 'invalid-input', message: '请求参数无效' }
    const selected = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: '视频', extensions: ['mp4', 'mov', 'mkv', 'webm'] }]
    })
    if (selected.canceled || selected.filePaths.length !== 1) return { ok: true, data: null }
    const grant = await fileGrants.issue(selected.filePaths[0], clientId, 'voice-reference')
    return {
      ok: true,
      data: { grantId: grant.id, displayName: grant.displayName, expiresAt: grant.expiresAt }
    }
  }
)

ipcMain.removeHandler(VOICE_IPC.createProfile)
ipcMain.handle(
  VOICE_IPC.createProfile,
  async (event, ...args: unknown[]): Promise<TalkHeroResult<VoiceProfileSummary>> => {
    const clientId = authorizeTalkHeroClient(event)
    if (clientId === null) return { ok: false, code: 'forbidden', message: '当前窗口无权创建音色' }
    try {
      if (args.length !== 1) throw new Error('创建音色参数无效')
      const input = parseCreateVoiceRequest(args[0])
      try {
        return { ok: true, data: await createVoiceProfile(clientId, input) }
      } catch (error) {
        return failure(error)
      }
    } catch (error) {
      return {
        ok: false,
        code: 'invalid-input',
        message: error instanceof Error ? error.message : '创建音色参数无效'
      }
    }
  }
)

ipcMain.removeHandler(VOICE_IPC.synthesize)
ipcMain.handle(
  VOICE_IPC.synthesize,
  async (event, ...args: unknown[]): Promise<TalkHeroResult<GeneratedAudio>> => {
    if (authorizeTalkHeroClient(event) === null)
      return { ok: false, code: 'forbidden', message: '当前窗口无权生成音频' }
    try {
      if (args.length !== 1) throw new Error('音频生成参数无效')
      const input = parseSynthesizeVoiceRequest(args[0])
      try {
        return { ok: true, data: await synthesizeVoice(input) }
      } catch (error) {
        return failure(error)
      }
    } catch (error) {
      return {
        ok: false,
        code: 'invalid-input',
        message: error instanceof Error ? error.message : '音频生成参数无效'
      }
    }
  }
)

ipcMain.removeHandler(VOICE_IPC.deleteProfile)
ipcMain.handle(
  VOICE_IPC.deleteProfile,
  async (event, ...args: unknown[]): Promise<TalkHeroResult<boolean>> => {
    if (authorizeTalkHeroClient(event) === null)
      return { ok: false, code: 'forbidden', message: '当前窗口无权删除音色' }
    if (args.length !== 1 || typeof args[0] !== 'string')
      return { ok: false, code: 'invalid-input', message: '音色 ID 无效' }
    try {
      await deleteVoiceProfile(args[0])
      return { ok: true, data: true }
    } catch (error) {
      return failure(error)
    }
  }
)
