import { describe, expect, it } from 'vitest'
import { deriveMouthRegion, matchTrackedFace, type FaceDetection } from './tracking-policy'

const face = (x: number, confidence = 0.95): FaceDetection => ({
  box: { x, y: 100, width: 100, height: 120 },
  confidence,
  landmarks: {
    rightEye: { x: x + 30, y: 140 },
    leftEye: { x: x + 70, y: 140 },
    nose: { x: x + 50, y: 165 },
    rightMouth: { x: x + 36, y: 190 },
    leftMouth: { x: x + 64, y: 190 }
  }
})

describe('YuNet tracking policy', () => {
  it('keeps the geometrically continuous target without selecting another visible person', () => {
    expect(
      matchTrackedFace(face(100), [face(310), face(108)], { width: 640, height: 480 })
    ).toEqual({
      ok: true,
      index: 1
    })
  })

  it('fails closed when two candidates are similarly plausible or confidence is low', () => {
    expect(matchTrackedFace(face(100), [face(94), face(106)], { width: 640, height: 480 })).toEqual(
      {
        ok: false,
        reason: '主体匹配存在歧义'
      }
    )
    expect(matchTrackedFace(face(100), [face(104, 0.6)], { width: 640, height: 480 })).toEqual({
      ok: false,
      reason: '当前帧没有可靠主体'
    })
  })

  it('derives a lower-face mouth region and rejects severe landmark asymmetry', () => {
    const region = deriveMouthRegion(face(100))
    expect(region).not.toBeNull()
    expect(region!.y).toBeGreaterThanOrEqual(160)
    expect(region!.width * region!.height).toBeLessThanOrEqual(100 * 120 * 0.25)

    const profile = face(100)
    profile.landmarks.nose.x = 175
    expect(deriveMouthRegion(profile)).toBeNull()
  })
})
