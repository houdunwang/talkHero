import { app } from 'electron'
import { createHash, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { realpath, rename, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fileGrants } from '@apps/inference/main/file-grants'
import { runWorkerTask } from '@apps/inference/main/worker-runtime'
import { taskRegistry } from '@apps/inference/main/task-service'
import type { PublishCapabilitySnapshot } from '../types/public'
import type {
  ConfirmPublishDraftRequest,
  PreparePublishRequest,
  PublishDraft,
  UpdatePublishDraftRequest
} from '../types/public'
import { createCoverCandidates } from './contracts'
import { PublishDraftRepository, type StoredPublishDraft } from './draft-repository'

export const getPublishCapabilitySnapshot = (): PublishCapabilitySnapshot => ({
  platforms: [
    { id: 'douyin', name: '抖音', officialHost: 'creator.douyin.com' },
    { id: 'xiaohongshu', name: '小红书', officialHost: 'creator.xiaohongshu.com' }
  ],
  requiresExplicitConfirmation: true,
  silentPublish: false,
  message: '发布前必须逐次确认；登录、验证码、风控或状态不确定时停止'
})

export const findGeneratedVideoTaskId = async (sourcePath: string): Promise<string | null> => {
  const source = await realpath(sourcePath)
  for (const task of taskRegistry.list()) {
    if (
      task.state !== 'completed' ||
      task.operation !== 'video.lipsync' ||
      !task.outputRelativePath
    )
      continue
    try {
      const expected = await realpath(
        join(app.getPath('userData'), 'talkhero', ...task.outputRelativePath.split('/'))
      )
      if (expected === source) return task.id
    } catch {
      // A missing historical output is not selectable for publishing.
    }
  }
  return null
}

const sha256File = async (path: string): Promise<string> => {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer)
  return hash.digest('hex')
}

const publishRoot = (): string => join(app.getPath('userData'), 'talkhero', 'publish')
let draftRepository: PublishDraftRepository | null = null
const repository = (): PublishDraftRepository =>
  (draftRepository ??= new PublishDraftRepository(publishRoot()))

const toPublicDraft = (draft: StoredPublishDraft): PublishDraft => ({
  id: draft.id,
  taskId: draft.taskId,
  title: draft.title,
  description: draft.description,
  topics: [...draft.topics],
  covers: draft.covers.map((cover) => ({
    id: cover.id,
    previewUrl: `talkhero-media://publish/${draft.id}/${cover.fileName}`,
    recommended: cover.recommended
  })),
  selectedCoverId: draft.selectedCoverId,
  platform: draft.platform,
  revision: draft.revision,
  state: draft.state,
  confirmed: draft.confirmedFingerprint !== null && draft.state === 'ready'
})

const createTopics = (script: string): string[] => {
  const words = script.match(/[\p{Script=Han}]{2,8}|[A-Za-z][A-Za-z0-9-]{2,20}/gu) ?? []
  return [...new Set(words)].slice(0, 3).map((word) => `#${word}`)
}

export const preparePublishDraft = async (
  clientId: number,
  input: PreparePublishRequest
): Promise<PublishDraft> => {
  const script = input.script.trim()
  if (!script || [...script].length > 720) throw new Error('发布文案无效')
  if (!/^[0-9a-f-]{36}$/iu.test(input.taskId)) throw new Error('生成任务 ID 无效')
  const sourceVideo = await fileGrants.consume(input.videoGrantId, clientId, 'publish-video')
  if (!sourceVideo) throw new Error('视频授权无效、已使用或已过期')
  const task = taskRegistry.get(input.taskId)
  const expectedRelativePath = `outputs/video/${input.taskId}.mp4`
  if (
    task?.state !== 'completed' ||
    task.operation !== 'video.lipsync' ||
    task.outputRelativePath !== expectedRelativePath
  )
    throw new Error('所选任务不是已完成的视频生成任务')
  const expectedVideo = join(
    app.getPath('userData'),
    'talkhero',
    ...expectedRelativePath.split('/')
  )
  if ((await realpath(sourceVideo)) !== (await realpath(expectedVideo)))
    throw new Error('所选视频与生成任务不匹配')
  const videoSha256 = await sha256File(sourceVideo)
  const draftId = randomUUID()
  const workerTaskId = randomUUID()
  const draftRoot = join(publishRoot(), draftId)
  const outputDir = join(draftRoot, '.worker-covers')
  const coverDir = join(draftRoot, 'covers')
  const title = [...script].slice(0, 24).join('')
  try {
    return await runWorkerTask(
      workerTaskId,
      'publish.cover',
      { sourceVideo, outputDir, title },
      async (output) => {
        await rename(outputDir, coverDir)
        const paths = [1, 2, 3].map((index) => join(coverDir, `cover-${index}.png`))
        const sizes = await Promise.all(paths.map(async (path) => (await stat(path)).size))
        if (sizes.some((size) => size === 0)) throw new Error('封面输出为空')
        const scores = [output.score1, output.score2, output.score3].map(Number)
        const candidates = createCoverCandidates(paths, scores)
        const coverHashes = await Promise.all(paths.map(sha256File))
        const selected = candidates.find((candidate) => candidate.recommended)
        if (!selected) throw new Error('封面推荐结果无效')
        const now = new Date().toISOString()
        const stored = await repository().create({
          id: draftId,
          taskId: input.taskId,
          videoPath: sourceVideo,
          videoSha256,
          title,
          description: script,
          topics: createTopics(script),
          covers: candidates.map((candidate, index) => ({
            id: `cover-${index + 1}`,
            fileName: `cover-${index + 1}.png`,
            sha256: coverHashes[index],
            recommended: candidate.recommended
          })),
          selectedCoverId: `cover-${candidates.indexOf(selected) + 1}`,
          platform: null,
          revision: 1,
          confirmedFingerprint: null,
          state: 'not-started',
          createdAt: now,
          updatedAt: now
        })
        return toPublicDraft(stored)
      }
    )
  } catch (error) {
    await rm(draftRoot, { recursive: true, force: true })
    throw error
  }
}

export const updatePublishDraft = async (input: UpdatePublishDraftRequest): Promise<PublishDraft> =>
  toPublicDraft(
    await repository().update(input.id, input.revision, {
      title: input.title,
      description: input.description,
      topics: input.topics,
      selectedCoverId: input.selectedCoverId,
      platform: input.platform
    })
  )

export const confirmPublishDraft = async (
  input: ConfirmPublishDraftRequest
): Promise<PublishDraft> => {
  const draft = await repository().get(input.id)
  if (draft.revision !== input.revision) throw new Error('发布草稿已变化，请刷新后重试')
  if ((await sha256File(draft.videoPath)) !== draft.videoSha256)
    throw new Error('视频内容已变化，请重新准备发布资料')
  const selected = draft.covers.find((cover) => cover.id === draft.selectedCoverId)
  if (!selected) throw new Error('封面无效')
  const coverPath = join(publishRoot(), draft.id, 'covers', selected.fileName)
  if ((await sha256File(coverPath)) !== selected.sha256)
    throw new Error('封面内容已变化，请重新准备发布资料')
  return toPublicDraft(await repository().confirm(input.id, input.revision))
}

export const listPublishDrafts = async (): Promise<PublishDraft[]> =>
  (await repository().list()).map(toPublicDraft)
