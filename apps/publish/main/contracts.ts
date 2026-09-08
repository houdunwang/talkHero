import { createHash, randomUUID } from 'node:crypto'
import type {
  ConfirmPublishDraftRequest,
  PreparePublishRequest,
  UpdatePublishDraftRequest
} from '../types/public'

// Publish 纯契约绑定内容指纹、官方域名与一次性提交授权。
export type PublishPlatform = 'douyin' | 'xiaohongshu'
export type PublishState =
  'not-started' | 'ready' | 'submitting' | 'waiting-user' | 'succeeded' | 'failed' | 'uncertain'

const PLATFORM_HOSTS: Readonly<Record<PublishPlatform, string>> = {
  douyin: 'creator.douyin.com',
  xiaohongshu: 'creator.xiaohongshu.com'
}

export const validatePlatformUrl = (platform: PublishPlatform, url: string): boolean => {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && parsed.hostname === PLATFORM_HOSTS[platform]
  } catch {
    return false
  }
}

export const buildDraftFingerprint = (draft: {
  taskId: string
  videoSha256: string
  coverSha256: string
  platform: PublishPlatform
  title: string
  description: string
  topics: string[]
}): string => createHash('sha256').update(JSON.stringify(draft)).digest('hex')

export type CoverCandidate = { frameId: string; score: number; recommended: boolean }

export const createCoverCandidates = (frameIds: string[], scores: number[]): CoverCandidate[] => {
  if (frameIds.length !== 3 || scores.length !== 3 || new Set(frameIds).size !== 3) {
    throw new Error('必须提供三个独立封面候选')
  }
  if (scores.some((score) => !Number.isFinite(score))) throw new Error('封面评分无效')
  const best = scores.indexOf(Math.max(...scores))
  return frameIds.map((frameId, index) => ({
    frameId,
    score: scores[index],
    recommended: index === best
  }))
}

export class PublishSession {
  state: PublishState = 'not-started'
  readonly #fingerprint: string
  #token: string | null = null
  #used = false

  constructor(fingerprint: string) {
    this.#fingerprint = fingerprint
  }

  confirm(fingerprint: string): string {
    if (this.state === 'uncertain') throw new Error('状态不确定，必须先人工核对平台作品列表')
    if (this.state === 'submitting' || this.state === 'waiting-user')
      throw new Error('提交已开始，不能重新授权')
    if (this.state === 'succeeded') throw new Error('提交已成功，不能重复授权')
    if (fingerprint !== this.#fingerprint) throw new Error('发布资料已变化，请重新确认')
    this.#token = randomUUID()
    this.#used = false
    this.state = 'ready'
    return this.#token
  }

  beginSubmit(token: string, fingerprint: string): boolean {
    if (
      this.state !== 'ready' ||
      this.#used ||
      token !== this.#token ||
      fingerprint !== this.#fingerprint
    )
      return false
    this.#used = true
    this.state = 'submitting'
    return true
  }

  markWaitingUser(): void {
    if (this.state !== 'submitting') throw new Error('非法发布状态转换')
    this.state = 'waiting-user'
  }

  markSucceeded(): void {
    if (this.state !== 'submitting') throw new Error('非法发布状态转换')
    this.state = 'succeeded'
  }

  markFailed(): void {
    if (this.state !== 'submitting' && this.state !== 'waiting-user')
      throw new Error('非法发布状态转换')
    this.state = 'failed'
  }

  markUncertain(): void {
    if (this.state !== 'submitting' && this.state !== 'waiting-user')
      throw new Error('非法发布状态转换')
    this.state = 'uncertain'
  }
}

export const parsePreparePublishRequest = (value: unknown): PreparePublishRequest => {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).sort().join('\0') !== ['script', 'taskId', 'videoGrantId'].join('\0')
  )
    throw new Error('发布资料参数无效')
  const input = value as Record<string, unknown>
  if (
    typeof input.taskId !== 'string' ||
    typeof input.videoGrantId !== 'string' ||
    typeof input.script !== 'string'
  )
    throw new Error('发布资料参数无效')
  return { taskId: input.taskId, videoGrantId: input.videoGrantId, script: input.script }
}

const exactRecord = (value: unknown, keys: string[]): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.keys(value).sort().join('\0') === [...keys].sort().join('\0')

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

export const parseUpdatePublishDraftRequest = (value: unknown): UpdatePublishDraftRequest => {
  if (
    !exactRecord(value, [
      'id',
      'revision',
      'title',
      'description',
      'topics',
      'selectedCoverId',
      'platform'
    ]) ||
    typeof value.id !== 'string' ||
    !UUID.test(value.id) ||
    !Number.isInteger(value.revision) ||
    (value.revision as number) < 1 ||
    typeof value.title !== 'string' ||
    typeof value.description !== 'string' ||
    !Array.isArray(value.topics) ||
    !value.topics.every((topic) => typeof topic === 'string') ||
    typeof value.selectedCoverId !== 'string' ||
    (value.platform !== null && value.platform !== 'douyin' && value.platform !== 'xiaohongshu')
  )
    throw new Error('发布草稿参数无效')
  return value as UpdatePublishDraftRequest
}

export const parseConfirmPublishDraftRequest = (value: unknown): ConfirmPublishDraftRequest => {
  if (
    !exactRecord(value, ['id', 'revision']) ||
    typeof value.id !== 'string' ||
    !UUID.test(value.id) ||
    !Number.isInteger(value.revision) ||
    (value.revision as number) < 1
  )
    throw new Error('发布确认参数无效')
  return value as ConfirmPublishDraftRequest
}
