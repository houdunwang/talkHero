import { createHash } from 'node:crypto'
import type { InspectVideoRequest } from '../types/public'

// Video 纯策略限定目标人物、音轨选择、缓存和局部融合区域。
export type Rectangle = { x: number; y: number; width: number; height: number }
export type VideoValidation = { ok: true } | { ok: false; reason: string }

export const validateVideoRequest = (input: {
  durationSeconds: number
  supportedCodec: boolean
  candidates: string[]
  targetPersonId: string
  audioPolicy: 'mix' | 'replace'
}): VideoValidation => {
  if (
    !Number.isFinite(input.durationSeconds) ||
    input.durationSeconds <= 0 ||
    input.durationSeconds > 180
  ) {
    return { ok: false, reason: 'A 视频时长必须大于 0 且不超过 3 分钟' }
  }
  if (!input.supportedCodec) return { ok: false, reason: '视频格式或编解码不支持' }
  if (!input.candidates.length) return { ok: false, reason: '视频中没有可用人物' }
  if (!input.targetPersonId || !input.candidates.includes(input.targetPersonId)) {
    return { ok: false, reason: '必须明确选择一个候选人物' }
  }
  if (input.audioPolicy !== 'mix' && input.audioPolicy !== 'replace') {
    return { ok: false, reason: '必须明确选择音轨策略' }
  }
  return { ok: true }
}

export const validateMouthRegion = (face: Rectangle, mouth: Rectangle): boolean =>
  face.width > 0 &&
  face.height > 0 &&
  mouth.width > 0 &&
  mouth.height > 0 &&
  mouth.x >= face.x &&
  mouth.y >= face.y &&
  mouth.x + mouth.width <= face.x + face.width &&
  mouth.y + mouth.height <= face.y + face.height &&
  mouth.y >= face.y + face.height * 0.5 &&
  mouth.width <= face.width * 0.8 &&
  mouth.height <= face.height * 0.45 &&
  mouth.width * mouth.height <= face.width * face.height * 0.25

const stableParameters = (parameters: Record<string, string | number | boolean>): string =>
  JSON.stringify(Object.entries(parameters).sort(([left], [right]) => left.localeCompare(right)))

export const buildTrackingCacheKey = (
  videoContentFingerprint: string,
  trackerVersion: string,
  parameters: Record<string, string | number | boolean>
): string =>
  createHash('sha256')
    .update(videoContentFingerprint)
    .update('\0')
    .update(trackerVersion)
    .update('\0')
    .update(stableParameters(parameters))
    .digest('hex')

export const parseInspectVideoRequest = (value: unknown): InspectVideoRequest => {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).sort().join('\0') !== ['authorized', 'grantId'].join('\0')
  )
    throw new Error('视频质检参数无效')
  const input = value as Record<string, unknown>
  if (typeof input.grantId !== 'string' || typeof input.authorized !== 'boolean') {
    throw new Error('视频质检参数无效')
  }
  return { grantId: input.grantId, authorized: input.authorized }
}
