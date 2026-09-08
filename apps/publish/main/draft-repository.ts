import { randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { buildDraftFingerprint, type PublishPlatform, type PublishState } from './contracts'

export type StoredCover = {
  id: string
  fileName: string
  sha256: string
  recommended: boolean
}

export type StoredPublishDraft = {
  id: string
  taskId: string
  videoPath: string
  videoSha256: string
  title: string
  description: string
  topics: string[]
  covers: StoredCover[]
  selectedCoverId: string
  platform: PublishPlatform | null
  revision: number
  confirmedFingerprint: string | null
  state: PublishState
  createdAt: string
  updatedAt: string
}

type EditableDraft = Pick<
  StoredPublishDraft,
  'title' | 'description' | 'topics' | 'selectedCoverId' | 'platform'
>

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const SHA256 = /^[0-9a-f]{64}$/u
const COVER_FILE = /^cover-[123]\.png$/u
const platforms = new Set<PublishPlatform>(['douyin', 'xiaohongshu'])
const states = new Set<PublishState>([
  'not-started',
  'ready',
  'submitting',
  'waiting-user',
  'succeeded',
  'failed',
  'uncertain'
])

const validateEditable = (draft: EditableDraft, covers: StoredCover[]): void => {
  if (!draft.title.trim() || [...draft.title.trim()].length > 40) throw new Error('标题无效')
  if (!draft.description.trim() || [...draft.description.trim()].length > 1_000)
    throw new Error('简介无效')
  if (
    !Array.isArray(draft.topics) ||
    draft.topics.length > 10 ||
    draft.topics.some(
      (topic) => typeof topic !== 'string' || !/^#[^#\s]{1,20}$/u.test(topic.trim())
    )
  )
    throw new Error('话题无效')
  if (!covers.some((cover) => cover.id === draft.selectedCoverId)) throw new Error('封面无效')
  if (draft.platform !== null && !platforms.has(draft.platform)) throw new Error('发布平台无效')
}

const parseDraft = (value: unknown): StoredPublishDraft => {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('发布草稿损坏')
  const draft = value as Partial<StoredPublishDraft>
  if (
    !UUID.test(draft.id ?? '') ||
    !UUID.test(draft.taskId ?? '') ||
    typeof draft.videoPath !== 'string' ||
    !isAbsolute(draft.videoPath) ||
    !SHA256.test(draft.videoSha256 ?? '') ||
    !Number.isInteger(draft.revision) ||
    (draft.revision ?? 0) < 1 ||
    typeof draft.createdAt !== 'string' ||
    typeof draft.updatedAt !== 'string' ||
    !states.has(draft.state as PublishState) ||
    (draft.confirmedFingerprint !== null && !SHA256.test(draft.confirmedFingerprint ?? '')) ||
    !Array.isArray(draft.covers) ||
    draft.covers.length !== 3 ||
    new Set(draft.covers.map((cover) => cover.id)).size !== 3 ||
    draft.covers.filter((cover) => cover.recommended).length !== 1 ||
    draft.covers.some(
      (cover) =>
        typeof cover.id !== 'string' ||
        !COVER_FILE.test(cover.fileName) ||
        !SHA256.test(cover.sha256) ||
        typeof cover.recommended !== 'boolean'
    )
  )
    throw new Error('发布草稿损坏')
  validateEditable(draft as EditableDraft, draft.covers)
  return structuredClone(draft as StoredPublishDraft)
}

// PublishDraftRepository 原子保存不含登录凭据的本地草稿，并用 revision 阻止旧页面覆盖。
export class PublishDraftRepository {
  readonly #root: string
  #queue = Promise.resolve()

  constructor(root: string) {
    this.#root = root
  }

  create(draft: StoredPublishDraft): Promise<StoredPublishDraft> {
    return this.#transact(async () => {
      const parsed = parseDraft(draft)
      if (
        parsed.revision !== 1 ||
        parsed.state !== 'not-started' ||
        parsed.confirmedFingerprint !== null
      )
        throw new Error('新草稿状态无效')
      try {
        await readFile(this.#path(parsed.id), 'utf8')
        throw new Error('发布草稿已存在')
      } catch (error) {
        if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
      }
      await this.#write(parsed)
      return structuredClone(parsed)
    })
  }

  async get(id: string): Promise<StoredPublishDraft> {
    if (!UUID.test(id)) throw new Error('发布草稿 ID 无效')
    try {
      return parseDraft(JSON.parse(await readFile(this.#path(id), 'utf8')))
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error('发布草稿损坏')
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
        throw new Error('发布草稿不存在')
      throw error
    }
  }

  list(): Promise<StoredPublishDraft[]> {
    return this.#transact(async () => {
      let entries
      try {
        entries = await readdir(this.#root, { withFileTypes: true })
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return []
        throw error
      }
      const drafts: StoredPublishDraft[] = []
      for (const entry of entries) {
        if (!entry.isDirectory() || !UUID.test(entry.name)) continue
        let draft = await this.get(entry.name)
        if (draft.state === 'submitting' || draft.state === 'waiting-user') {
          draft = parseDraft({
            ...draft,
            revision: draft.revision + 1,
            state: 'uncertain',
            updatedAt: new Date().toISOString()
          })
          await this.#write(draft)
        }
        drafts.push(draft)
      }
      return drafts.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    })
  }

  update(id: string, expectedRevision: number, change: EditableDraft): Promise<StoredPublishDraft> {
    return this.#transact(async () => {
      const current = await this.get(id)
      if (current.revision !== expectedRevision) throw new Error('发布草稿已变化，请刷新后重试')
      if (['submitting', 'waiting-user', 'succeeded', 'uncertain'].includes(current.state))
        throw new Error('当前发布状态不允许编辑')
      validateEditable(change, current.covers)
      const next = parseDraft({
        ...current,
        ...change,
        title: change.title.trim(),
        description: change.description.trim(),
        topics: change.topics.map((topic) => topic.trim()),
        revision: current.revision + 1,
        confirmedFingerprint: null,
        state: 'not-started',
        updatedAt: new Date().toISOString()
      })
      await this.#write(next)
      return structuredClone(next)
    })
  }

  confirm(id: string, expectedRevision: number): Promise<StoredPublishDraft> {
    return this.#transact(async () => {
      const current = await this.get(id)
      if (current.revision !== expectedRevision) throw new Error('发布草稿已变化，请刷新后重试')
      if (current.state !== 'not-started' && current.state !== 'failed')
        throw new Error('当前发布状态不能确认')
      if (!current.platform) throw new Error('必须选择发布平台')
      const cover = current.covers.find((candidate) => candidate.id === current.selectedCoverId)
      if (!cover) throw new Error('封面无效')
      const fingerprint = buildDraftFingerprint({
        taskId: current.taskId,
        videoSha256: current.videoSha256,
        coverSha256: cover.sha256,
        platform: current.platform,
        title: current.title,
        description: current.description,
        topics: current.topics
      })
      const next = parseDraft({
        ...current,
        revision: current.revision + 1,
        confirmedFingerprint: fingerprint,
        state: 'ready',
        updatedAt: new Date().toISOString()
      })
      await this.#write(next)
      return structuredClone(next)
    })
  }

  #path(id: string): string {
    return join(this.#root, id, 'draft.json')
  }

  async #write(draft: StoredPublishDraft): Promise<void> {
    const directory = join(this.#root, draft.id)
    await mkdir(directory, { recursive: true })
    const temporary = join(directory, `.draft-${randomUUID()}.tmp`)
    await writeFile(temporary, JSON.stringify(draft, null, 2), { encoding: 'utf8', flag: 'wx' })
    await rename(temporary, this.#path(draft.id))
  }

  #transact<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.#queue.then(operation)
    this.#queue = result.then(
      () => undefined,
      () => undefined
    )
    return result
  }
}
