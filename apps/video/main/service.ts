import { app } from 'electron'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileGrants } from '@apps/inference/main/file-grants'
import { runWorkerTask } from '@apps/inference/main/worker-runtime'
import type { VideoWorkspaceSnapshot } from '../types/public'
import type { InspectVideoRequest, VideoInspection } from '../types/public'

export const getVideoWorkspaceSnapshot = (): VideoWorkspaceSnapshot => ({
  maxDurationSeconds: 180,
  lipModel: 'muse-talk-1.5',
  internalFaceSize: 256,
  audioPolicies: ['mix', 'replace'],
  readyJobs: 0
})

export const inspectVideo = async (
  clientId: number,
  input: InspectVideoRequest
): Promise<VideoInspection> => {
  if (!input.authorized) throw new Error('必须先确认已获得视频人物授权')
  const sourceVideo = await fileGrants.consume(input.grantId, clientId, 'video-source')
  if (!sourceVideo) throw new Error('文件授权无效、已使用或已过期')
  const taskId = randomUUID()
  const reportPath = join(app.getPath('userData'), 'talkhero', 'tasks', taskId, 'inspection.json')
  return runWorkerTask(taskId, 'video.inspect', { sourceVideo, reportPath }, async () => {
    const report: unknown = JSON.parse(await readFile(reportPath, 'utf8'))
    if (typeof report !== 'object' || report === null) throw new Error('视频质检报告无效')
    const value = report as Record<string, unknown>
    if (
      typeof value.durationSeconds !== 'number' ||
      typeof value.width !== 'number' ||
      typeof value.height !== 'number' ||
      typeof value.codec !== 'string' ||
      value.usable !== false ||
      typeof value.reason !== 'string'
    )
      throw new Error('视频质检报告字段无效')
    return {
      taskId,
      durationSeconds: value.durationSeconds,
      width: value.width,
      height: value.height,
      codec: value.codec,
      usable: false,
      reason: value.reason
    }
  })
}
