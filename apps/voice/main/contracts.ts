import type {
  CreateVoiceRequest,
  RenameVoiceRequest,
  SynthesizeVoiceRequest,
  UpdateVoiceRequest
} from '../types/public'

// Voice 输入规则独立于模型实现，确保无效或未授权素材不会进入 Worker。
export type ValidationResult = { ok: true } | { ok: false; reason: string }

export const validateVoiceReference = (input: {
  authorized: boolean
  durationSeconds: number
  audioTracks: number
  speakers: number
}): ValidationResult => {
  if (!input.authorized) return { ok: false, reason: '必须先确认已获得人脸与人声授权' }
  if (
    !Number.isFinite(input.durationSeconds) ||
    input.durationSeconds < 10 ||
    input.durationSeconds > 60
  ) {
    return { ok: false, reason: '参考视频时长必须为 10～60 秒' }
  }
  if (input.audioTracks !== 1) return { ok: false, reason: '参考视频必须包含一条可用音轨' }
  if (input.speakers !== 1) return { ok: false, reason: '参考视频必须只有一个有效说话人' }
  return { ok: true }
}

export const validateScript = (script: string, speed: number): ValidationResult => {
  const normalized = script.trim()
  if (!normalized) return { ok: false, reason: '文案不能为空' }
  if (!Number.isFinite(speed) || speed < 0.8 || speed > 1.2) {
    return { ok: false, reason: '语速必须在自然范围 0.8～1.2 内' }
  }
  if ([...normalized].length > 720) return { ok: false, reason: '文案超出三分钟可自然承载的上限' }
  return { ok: true }
}

export const segmentScript = (script: string, maxCharacters = 120): string[] => {
  if (!Number.isInteger(maxCharacters) || maxCharacters < 1) throw new Error('分段长度无效')
  const segments: string[] = []
  let current = ''
  for (const character of script) {
    current += character
    if (current.length >= maxCharacters || /[。！？；.!?;]/u.test(character)) {
      segments.push(current)
      current = ''
    }
  }
  if (current) segments.push(current)
  return segments
}

const exactRecord = (value: unknown, keys: string[]): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.keys(value).sort().join('\0') === [...keys].sort().join('\0')

export const parseCreateVoiceRequest = (value: unknown): CreateVoiceRequest => {
  if (
    !exactRecord(value, ['grantId', 'name', 'authorized']) ||
    typeof value.grantId !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.authorized !== 'boolean'
  )
    throw new Error('创建音色参数无效')
  return { grantId: value.grantId, name: value.name, authorized: value.authorized }
}

export const parseSynthesizeVoiceRequest = (value: unknown): SynthesizeVoiceRequest => {
  const emotions = ['natural'] as const
  if (
    !exactRecord(value, ['profileId', 'text', 'speed', 'emotion']) ||
    typeof value.profileId !== 'string' ||
    typeof value.text !== 'string' ||
    typeof value.speed !== 'number' ||
    typeof value.emotion !== 'string' ||
    !emotions.includes(value.emotion as (typeof emotions)[number])
  )
    throw new Error('音频生成参数无效')
  return value as SynthesizeVoiceRequest
}

const PROFILE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

export const parseRenameVoiceRequest = (value: unknown): RenameVoiceRequest => {
  if (
    !exactRecord(value, ['profileId', 'name']) ||
    typeof value.profileId !== 'string' ||
    !PROFILE_ID.test(value.profileId) ||
    typeof value.name !== 'string'
  )
    throw new Error('音色重命名参数无效')
  return value as RenameVoiceRequest
}

export const parseUpdateVoiceRequest = (value: unknown): UpdateVoiceRequest => {
  if (
    !exactRecord(value, ['profileId', 'grantId', 'name', 'authorized']) ||
    typeof value.profileId !== 'string' ||
    !PROFILE_ID.test(value.profileId) ||
    typeof value.grantId !== 'string' ||
    !value.grantId.trim() ||
    typeof value.name !== 'string' ||
    typeof value.authorized !== 'boolean'
  )
    throw new Error('音色更新参数无效')
  return value as UpdateVoiceRequest
}
