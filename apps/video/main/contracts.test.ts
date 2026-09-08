import { describe, expect, it } from 'vitest'
import {
  buildTrackingCacheKey,
  parseInspectVideoRequest,
  validateMouthRegion,
  validateVideoRequest
} from './contracts'

describe('video contracts', () => {
  it('requires a supported <=3 minute video, a selected person and explicit audio policy', () => {
    expect(
      validateVideoRequest({
        durationSeconds: 181,
        supportedCodec: true,
        candidates: ['p1'],
        targetPersonId: 'p1',
        audioPolicy: 'mix'
      }).ok
    ).toBe(false)
    expect(
      validateVideoRequest({
        durationSeconds: 60,
        supportedCodec: true,
        candidates: ['p1', 'p2'],
        targetPersonId: '',
        audioPolicy: 'mix'
      }).ok
    ).toBe(false)
    expect(
      validateVideoRequest({
        durationSeconds: 60,
        supportedCodec: true,
        candidates: ['p1'],
        targetPersonId: 'p1',
        audioPolicy: 'replace'
      })
    ).toEqual({ ok: true })
  })

  it('only accepts a mouth blend region contained by the tracked face', () => {
    const face = { x: 100, y: 100, width: 200, height: 200 }
    expect(validateMouthRegion(face, { x: 140, y: 210, width: 120, height: 55 })).toBe(true)
    expect(validateMouthRegion(face, { x: 90, y: 90, width: 220, height: 220 })).toBe(false)
    expect(validateMouthRegion(face, { x: 101, y: 101, width: 198, height: 198 })).toBe(false)
    expect(validateMouthRegion(face, { x: 140, y: 120, width: 120, height: 55 })).toBe(false)
  })

  it('invalidates tracking cache when content, tracker version or parameters change', () => {
    const base = buildTrackingCacheKey('sha256:a', 'tracker-1', { stride: 1 })
    expect(buildTrackingCacheKey('sha256:a', 'tracker-1', { stride: 1 })).toBe(base)
    expect(buildTrackingCacheKey('sha256:b', 'tracker-1', { stride: 1 })).not.toBe(base)
    expect(buildTrackingCacheKey('sha256:a', 'tracker-2', { stride: 1 })).not.toBe(base)
    expect(buildTrackingCacheKey('sha256:a', 'tracker-1', { stride: 2 })).not.toBe(base)
  })

  it('does not accept a renderer supplied source path', () => {
    expect(parseInspectVideoRequest({ grantId: 'g', authorized: true })).toEqual({
      grantId: 'g',
      authorized: true
    })
    expect(() =>
      parseInspectVideoRequest({ grantId: 'g', authorized: true, sourceVideo: '/tmp/a.mp4' })
    ).toThrow('参数无效')
  })
})
