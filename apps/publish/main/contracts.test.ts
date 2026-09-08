import { describe, expect, it } from 'vitest'
import {
  PublishSession,
  buildDraftFingerprint,
  createCoverCandidates,
  parseConfirmPublishDraftRequest,
  parsePreparePublishRequest,
  parseUpdatePublishDraftRequest,
  validatePlatformUrl
} from './contracts'

describe('publish contracts', () => {
  it('creates exactly three independent cover candidates and binds the draft to content', () => {
    const covers = createCoverCandidates(['frame-a', 'frame-b', 'frame-c'], [0.6, 0.9, 0.7])
    expect(covers).toHaveLength(3)
    expect(covers.filter((cover) => cover.recommended)).toHaveLength(1)
    expect(covers.find((cover) => cover.recommended)?.frameId).toBe('frame-b')

    const draft = {
      taskId: 't1',
      videoSha256: 'a',
      coverSha256: 'b',
      platform: 'douyin' as const,
      title: '标题',
      description: '简介',
      topics: ['本地AI']
    }
    const first = buildDraftFingerprint(draft)
    const changed = buildDraftFingerprint({ ...draft, description: '修改后的简介' })
    expect(first).not.toBe(changed)
  })

  it('only accepts the official creator domains', () => {
    expect(
      validatePlatformUrl('douyin', 'https://creator.douyin.com/creator-micro/content/upload')
    ).toBe(true)
    expect(
      validatePlatformUrl('xiaohongshu', 'https://creator.xiaohongshu.com/publish/publish')
    ).toBe(true)
    expect(validatePlatformUrl('douyin', 'https://creator.douyin.com.evil.example/upload')).toBe(
      false
    )
    expect(validatePlatformUrl('xiaohongshu', 'https://example.com')).toBe(false)
  })

  it('requires one explicit confirmation and never retries an uncertain submission', () => {
    const session = new PublishSession('fingerprint-1')
    const token = session.confirm('fingerprint-1')
    expect(session.beginSubmit(token, 'fingerprint-1')).toBe(true)
    expect(session.beginSubmit(token, 'fingerprint-1')).toBe(false)
    expect(() => session.confirm('fingerprint-1')).toThrow('提交已开始')
    session.markUncertain()
    expect(session.state).toBe('uncertain')
    expect(() => session.confirm('fingerprint-1')).toThrow('状态不确定')
  })

  it('does not issue another token after a verified successful submission', () => {
    const session = new PublishSession('fingerprint-1')
    const token = session.confirm('fingerprint-1')
    session.beginSubmit(token, 'fingerprint-1')
    session.markSucceeded()
    expect(() => session.confirm('fingerprint-1')).toThrow('提交已成功')
  })

  it('rejects renderer supplied paths and additional publish fields', () => {
    expect(parsePreparePublishRequest({ taskId: 't', videoGrantId: 'g', script: '文案' })).toEqual({
      taskId: 't',
      videoGrantId: 'g',
      script: '文案'
    })
    expect(() =>
      parsePreparePublishRequest({
        taskId: 't',
        videoGrantId: 'g',
        script: '文案',
        videoPath: '/tmp/a.mp4'
      })
    ).toThrow('参数无效')
  })

  it('strictly parses editable drafts and confirmation revisions', () => {
    const update = {
      id: '123e4567-e89b-42d3-a456-426614174100',
      revision: 2,
      title: '标题',
      description: '简介',
      topics: ['#本地AI'],
      selectedCoverId: 'cover-2',
      platform: 'douyin' as const
    }
    expect(parseUpdatePublishDraftRequest(update)).toEqual(update)
    expect(
      parseConfirmPublishDraftRequest({
        id: '123e4567-e89b-42d3-a456-426614174100',
        revision: 3
      })
    ).toEqual({ id: '123e4567-e89b-42d3-a456-426614174100', revision: 3 })
    expect(() => parseUpdatePublishDraftRequest({ ...update, videoPath: '/tmp/a.mp4' })).toThrow(
      '参数无效'
    )
    expect(() => parseConfirmPublishDraftRequest({ id: update.id, revision: 0 })).toThrow(
      '参数无效'
    )
  })
})
