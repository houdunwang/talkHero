import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { PublishDraftRepository, type StoredPublishDraft } from './draft-repository'

const roots: string[] = []

const createDraft = (): StoredPublishDraft => ({
  id: '123e4567-e89b-42d3-a456-426614174100',
  taskId: '123e4567-e89b-42d3-a456-426614174101',
  videoPath: '/managed/output.mp4',
  videoSha256: 'a'.repeat(64),
  title: '原始标题',
  description: '原始简介',
  topics: ['#本地AI'],
  covers: [
    { id: 'cover-1', fileName: 'cover-1.png', sha256: 'b'.repeat(64), recommended: true },
    { id: 'cover-2', fileName: 'cover-2.png', sha256: 'c'.repeat(64), recommended: false },
    { id: 'cover-3', fileName: 'cover-3.png', sha256: 'd'.repeat(64), recommended: false }
  ],
  selectedCoverId: 'cover-1',
  platform: null,
  revision: 1,
  confirmedFingerprint: null,
  state: 'not-started',
  createdAt: '2026-09-08T00:00:00.000Z',
  updatedAt: '2026-09-08T00:00:00.000Z'
})

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('PublishDraftRepository', () => {
  it('persists a draft and restores it after reopening the repository', async () => {
    const root = await mkdtemp(join(tmpdir(), 'talkhero-publish-'))
    roots.push(root)
    await new PublishDraftRepository(root).create(createDraft())

    await expect(new PublishDraftRepository(root).get(createDraft().id)).resolves.toMatchObject({
      title: '原始标题',
      revision: 1,
      state: 'not-started'
    })
    await expect(new PublishDraftRepository(root).list()).resolves.toHaveLength(1)
  })

  it('invalidates confirmation on edits and rejects stale revisions', async () => {
    const root = await mkdtemp(join(tmpdir(), 'talkhero-publish-'))
    roots.push(root)
    const repository = new PublishDraftRepository(root)
    await repository.create({ ...createDraft(), platform: 'douyin' })
    const confirmed = await repository.confirm(createDraft().id, 1)
    expect(confirmed.confirmedFingerprint).toMatch(/^[0-9a-f]{64}$/u)
    expect(confirmed.state).toBe('ready')

    const edited = await repository.update(createDraft().id, confirmed.revision, {
      title: '修改后的标题',
      description: confirmed.description,
      topics: confirmed.topics,
      selectedCoverId: confirmed.selectedCoverId,
      platform: 'xiaohongshu'
    })
    expect(edited.confirmedFingerprint).toBeNull()
    expect(edited.state).toBe('not-started')
    await expect(
      repository.update(createDraft().id, 1, {
        title: '旧页面覆盖',
        description: edited.description,
        topics: edited.topics,
        selectedCoverId: edited.selectedCoverId,
        platform: edited.platform
      })
    ).rejects.toThrow('草稿已变化')
  })

  it('requires a platform and a valid selected cover before confirmation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'talkhero-publish-'))
    roots.push(root)
    const repository = new PublishDraftRepository(root)
    await repository.create(createDraft())
    await expect(repository.confirm(createDraft().id, 1)).rejects.toThrow('必须选择发布平台')
    await expect(
      repository.update(createDraft().id, 1, {
        title: '标题',
        description: '简介',
        topics: ['#话题'],
        selectedCoverId: 'cover-missing',
        platform: 'douyin'
      })
    ).rejects.toThrow('封面无效')
  })

  it('restores an interrupted submission as uncertain and no longer confirmed', async () => {
    const root = await mkdtemp(join(tmpdir(), 'talkhero-publish-'))
    roots.push(root)
    const repository = new PublishDraftRepository(root)
    const draft = { ...createDraft(), platform: 'douyin' as const }
    await repository.create(draft)
    const path = join(root, draft.id, 'draft.json')
    const persisted = JSON.parse(await readFile(path, 'utf8')) as StoredPublishDraft
    await writeFile(
      path,
      JSON.stringify({
        ...persisted,
        state: 'submitting',
        confirmedFingerprint: 'f'.repeat(64)
      })
    )

    const [restored] = await new PublishDraftRepository(root).list()
    expect(restored.state).toBe('uncertain')
    expect((JSON.parse(await readFile(path, 'utf8')) as StoredPublishDraft).state).toBe('uncertain')
  })
})
