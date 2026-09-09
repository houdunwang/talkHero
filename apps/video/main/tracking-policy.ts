import type { Rectangle } from './contracts'

type Point = { x: number; y: number }

export type FaceDetection = {
  box: Rectangle
  confidence: number
  landmarks: {
    rightEye: Point
    leftEye: Point
    nose: Point
    rightMouth: Point
    leftMouth: Point
  }
}

export type TrackDecision =
  { ok: true; index: number } | { ok: false; reason: '当前帧没有可靠主体' | '主体匹配存在歧义' }

const center = (box: Rectangle): Point => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2
})

const distance = (left: Point, right: Point): number =>
  Math.hypot(left.x - right.x, left.y - right.y)

const intersectionOverUnion = (left: Rectangle, right: Rectangle): number => {
  const width = Math.max(
    0,
    Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x)
  )
  const height = Math.max(
    0,
    Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y)
  )
  const intersection = width * height
  return intersection / (left.width * left.height + right.width * right.height - intersection)
}

const validBox = (detection: FaceDetection, frame: { width: number; height: number }): boolean =>
  detection.confidence >= 0.8 &&
  detection.box.width > 0 &&
  detection.box.height > 0 &&
  detection.box.x >= 0 &&
  detection.box.y >= 0 &&
  detection.box.x + detection.box.width <= frame.width &&
  detection.box.y + detection.box.height <= frame.height

const continuityScore = (previous: FaceDetection, current: FaceDetection): number | null => {
  const previousDiagonal = Math.hypot(previous.box.width, previous.box.height)
  const centerMovement = distance(center(previous.box), center(current.box)) / previousDiagonal
  const scaleChange = Math.abs(
    Math.log((current.box.width * current.box.height) / (previous.box.width * previous.box.height))
  )
  if (centerMovement > 0.6 || scaleChange > 0.7) return null
  const landmarkMovement =
    distance(previous.landmarks.nose, current.landmarks.nose) / previousDiagonal
  if (landmarkMovement > 0.65) return null
  return (
    intersectionOverUnion(previous.box, current.box) * 0.65 +
    (1 - centerMovement / 0.6) * 0.25 +
    (1 - scaleChange / 0.7) * 0.1
  )
}

export const matchTrackedFace = (
  previous: FaceDetection,
  candidates: FaceDetection[],
  frame: { width: number; height: number }
): TrackDecision => {
  const scored = candidates
    .map((candidate, index) => ({ index, score: continuityScore(previous, candidate), candidate }))
    .filter(
      (item): item is { index: number; score: number; candidate: FaceDetection } =>
        validBox(item.candidate, frame) && item.score !== null
    )
    .sort((left, right) => right.score - left.score)
  if (!scored.length || scored[0].score < 0.35) {
    return { ok: false, reason: '当前帧没有可靠主体' }
  }
  if (scored[1] && scored[0].score - scored[1].score < 0.08) {
    return { ok: false, reason: '主体匹配存在歧义' }
  }
  return { ok: true, index: scored[0].index }
}

export const deriveMouthRegion = (detection: FaceDetection): Rectangle | null => {
  const { box, landmarks } = detection
  const eyeDistance = distance(landmarks.rightEye, landmarks.leftEye)
  const eyeCenterX = (landmarks.rightEye.x + landmarks.leftEye.x) / 2
  const mouthDistance = distance(landmarks.rightMouth, landmarks.leftMouth)
  if (
    detection.confidence < 0.8 ||
    eyeDistance <= 0 ||
    mouthDistance <= 0 ||
    Math.abs(landmarks.nose.x - eyeCenterX) / eyeDistance > 0.35
  ) {
    return null
  }
  const width = Math.min(box.width * 0.72, Math.max(box.width * 0.34, mouthDistance * 1.6))
  const height = Math.min(box.height * 0.32, Math.max(box.height * 0.18, width * 0.55))
  const mouthCenterX = (landmarks.rightMouth.x + landmarks.leftMouth.x) / 2
  const mouthCenterY = (landmarks.rightMouth.y + landmarks.leftMouth.y) / 2
  const region = {
    x: mouthCenterX - width / 2,
    y: Math.max(box.y + box.height * 0.5, mouthCenterY - height * 0.45),
    width,
    height
  }
  if (
    region.x < box.x ||
    region.y < box.y ||
    region.x + region.width > box.x + box.width ||
    region.y + region.height > box.y + box.height ||
    region.width * region.height > box.width * box.height * 0.25
  ) {
    return null
  }
  return region
}
