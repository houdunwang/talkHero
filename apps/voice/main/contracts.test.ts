import { describe, expect, it } from 'vitest'
import {
  parseCreateVoiceRequest,
  parseRenameVoiceRequest,
  parseSynthesizeVoiceRequest,
  parseUpdateVoiceRequest,
  segmentScript,
  validateScript,
  validateVoiceReference
} from './contracts'

describe('voice contracts', () => {
  it('requires authorization and a usable 10-60 second single-speaker reference', () => {
    expect(
      validateVoiceReference({
        authorized: false,
        durationSeconds: 20,
        audioTracks: 1,
        speakers: 1
      })
    ).toEqual({
      ok: false,
      reason: '必须先确认已获得人脸与人声授权'
    })
    expect(
      validateVoiceReference({ authorized: true, durationSeconds: 9, audioTracks: 1, speakers: 1 })
        .ok
    ).toBe(false)
    expect(
      validateVoiceReference({ authorized: true, durationSeconds: 20, audioTracks: 0, speakers: 0 })
        .ok
    ).toBe(false)
    expect(
      validateVoiceReference({ authorized: true, durationSeconds: 20, audioTracks: 1, speakers: 2 })
        .ok
    ).toBe(false)
    expect(
      validateVoiceReference({ authorized: true, durationSeconds: 20, audioTracks: 1, speakers: 1 })
    ).toEqual({ ok: true })
  })

  it('rejects blank or unnaturally long scripts and preserves all content while segmenting', () => {
    expect(validateScript('   ', 1)).toEqual({ ok: false, reason: '文案不能为空' })
    expect(validateScript('这是一段无法在目标视频内自然读完的文案'.repeat(80), 0.2).ok).toBe(false)

    const script = '第一句用于测试。第二句继续说明！第三句收尾？'
    const segments = segmentScript(script, 12)
    expect(segments.length).toBeGreaterThan(1)
    expect(segments.join('')).toBe(script)
  })

  it('strictly parses renderer requests and rejects added fields or unknown emotions', () => {
    expect(parseCreateVoiceRequest({ grantId: 'g', name: 'n', authorized: true })).toEqual({
      grantId: 'g',
      name: 'n',
      authorized: true
    })
    expect(() =>
      parseCreateVoiceRequest({ grantId: 'g', name: 'n', authorized: true, path: '/tmp/private' })
    ).toThrow('参数无效')
    expect(() =>
      parseSynthesizeVoiceRequest({ profileId: 'p', text: 'x', speed: 1, emotion: 'angry' })
    ).toThrow('参数无效')
  })

  it('strictly parses rename and update requests without renderer paths', () => {
    const profileId = '123e4567-e89b-42d3-a456-426614174000'
    expect(parseRenameVoiceRequest({ profileId, name: '新名称' })).toEqual({
      profileId,
      name: '新名称'
    })
    expect(
      parseUpdateVoiceRequest({ profileId, grantId: 'grant', name: '更新音色', authorized: true })
    ).toEqual({ profileId, grantId: 'grant', name: '更新音色', authorized: true })
    expect(() =>
      parseUpdateVoiceRequest({
        profileId,
        grantId: 'grant',
        name: '更新音色',
        authorized: true,
        sourcePath: '/tmp/b.mp4'
      })
    ).toThrow('参数无效')
  })
})
