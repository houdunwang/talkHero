import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile
} from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { basename, join } from 'node:path'
import type { VoiceProfileSummary } from '../types/public'

type CreateVoiceProfile = {
  id: string
  name: string
  referenceAudioPath: string
  transcript: string
  featuresPath: string
}

type ReplaceVoiceProfile = Omit<CreateVoiceProfile, 'id'>

const PROFILE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

// VoiceProfileRepository 只管理派生音色产物，不保存或移动原始 B 视频。
class VoiceProfileStore {
  readonly #root: string

  constructor(root: string) {
    this.#root = root
  }

  async list(): Promise<VoiceProfileSummary[]> {
    try {
      const value: unknown = JSON.parse(await readFile(this.#indexPath(), 'utf8'))
      if (!Array.isArray(value) || !value.every(this.#isProfile)) throw new Error('音色索引损坏')
      await this.#recoverQuarantined(value)
      await this.#recoverUpdates(value)
      await this.#recoverCreates(value)
      return value
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return []
      throw error
    }
  }

  async create(input: CreateVoiceProfile): Promise<VoiceProfileSummary> {
    if (!PROFILE_ID.test(input.id)) throw new Error('音色 ID 无效')
    const name = input.name.trim()
    if (!name) throw new Error('音色名称不能为空')
    const transcript = input.transcript.trim()
    if (!transcript) throw new Error('自动转写不能为空')
    await mkdir(this.#root, { recursive: true })
    const profiles = await this.list()
    if (profiles.some((profile) => profile.id === input.id)) throw new Error('音色已存在')
    const temporary = join(this.#root, `.creating-${input.id}-${randomUUID()}`)
    await mkdir(temporary)
    const target = join(this.#root, input.id)
    const now = new Date().toISOString()
    const profile: VoiceProfileSummary = {
      id: input.id,
      name,
      createdAt: now,
      updatedAt: now,
      revisionId: randomUUID(),
      modelVersion: 'cosyvoice2-0.5b'
    }
    let profileCommitted = false
    try {
      await copyFile(input.referenceAudioPath, join(temporary, 'reference.wav'))
      await copyFile(input.featuresPath, join(temporary, 'features.bin'))
      await writeFile(join(temporary, 'transcript.txt'), transcript, {
        encoding: 'utf8',
        flag: 'wx'
      })
      await writeFile(join(temporary, 'profile.json'), JSON.stringify(profile, null, 2), {
        encoding: 'utf8',
        flag: 'wx'
      })
      await rename(temporary, target)
      profileCommitted = true
      await this.#writeIndex([...profiles, profile])
      return profile
    } catch (error) {
      await rm(temporary, { recursive: true, force: true })
      if (profileCommitted) await rm(target, { recursive: true, force: true })
      throw error
    }
  }

  async remove(id: string, activeProfileIds: ReadonlySet<string>): Promise<void> {
    if (!PROFILE_ID.test(id) || basename(id) !== id) throw new Error('音色 ID 无效')
    if (activeProfileIds.has(id)) throw new Error('运行中任务正在使用该音色')
    const profiles = await this.list()
    if (!profiles.some((profile) => profile.id === id)) throw new Error('音色不存在')
    const target = join(this.#root, id)
    const quarantined = join(this.#root, `.deleting-${id}-${randomUUID()}`)
    await rename(target, quarantined)
    try {
      await this.#writeIndex(profiles.filter((profile) => profile.id !== id))
    } catch (error) {
      await rename(quarantined, target)
      throw error
    }
    await rm(quarantined, { recursive: true })
  }

  async renameProfile(
    _id: string,
    _name: string,
    activeProfileIds: ReadonlySet<string>
  ): Promise<VoiceProfileSummary> {
    const profiles = await this.list()
    const current = this.#findProfile(profiles, _id)
    const name = this.#validateName(_name)
    const transcript = await readFile(join(this.#root, _id, 'transcript.txt'), 'utf8')
    return this.#replace(
      profiles,
      current,
      {
        name,
        referenceAudioPath: join(this.#root, _id, 'reference.wav'),
        transcript,
        featuresPath: join(this.#root, _id, 'features.bin')
      },
      activeProfileIds
    )
  }

  async replaceProfile(
    _id: string,
    _input: ReplaceVoiceProfile,
    _activeProfileIds: ReadonlySet<string>
  ): Promise<VoiceProfileSummary> {
    if (_activeProfileIds.has(_id)) throw new Error('运行中任务正在使用该音色')
    const profiles = await this.list()
    const current = this.#findProfile(profiles, _id)
    return this.#replace(
      profiles,
      current,
      { ..._input, name: this.#validateName(_input.name) },
      _activeProfileIds
    )
  }

  async getArtifactPath(
    id: string,
    artifact: 'reference.wav' | 'transcript.txt' | 'features.bin'
  ): Promise<string> {
    if (!PROFILE_ID.test(id) || !(await this.list()).some((profile) => profile.id === id)) {
      throw new Error('音色不存在')
    }
    return join(this.#root, id, artifact)
  }

  #indexPath(): string {
    return join(this.#root, 'index.json')
  }

  #validateName(value: string): string {
    const name = value.trim()
    if (!name || [...name].length > 40) throw new Error('音色名称必须为 1～40 个字符')
    return name
  }

  #findProfile(profiles: VoiceProfileSummary[], id: string): VoiceProfileSummary {
    if (!PROFILE_ID.test(id) || basename(id) !== id) throw new Error('音色 ID 无效')
    const profile = profiles.find((candidate) => candidate.id === id)
    if (!profile) throw new Error('音色不存在')
    return profile
  }

  async #replace(
    profiles: VoiceProfileSummary[],
    current: VoiceProfileSummary,
    input: ReplaceVoiceProfile,
    activeProfileIds: ReadonlySet<string>
  ): Promise<VoiceProfileSummary> {
    if (activeProfileIds.has(current.id)) throw new Error('运行中任务正在使用该音色')
    const transcript = input.transcript.trim()
    if (!transcript) throw new Error('自动转写不能为空')
    const temporary = await mkdtemp(join(this.#root, '.updating-new-'))
    const target = join(this.#root, current.id)
    const backup = join(this.#root, `.updating-old-${current.id}-${randomUUID()}`)
    const next: VoiceProfileSummary = {
      ...current,
      name: input.name,
      updatedAt: new Date().toISOString(),
      revisionId: randomUUID()
    }
    let backupMoved = false
    let replacementMoved = false
    let indexCommitted = false
    try {
      await copyFile(input.referenceAudioPath, join(temporary, 'reference.wav'))
      await copyFile(input.featuresPath, join(temporary, 'features.bin'))
      await writeFile(join(temporary, 'transcript.txt'), transcript, {
        encoding: 'utf8',
        flag: 'wx'
      })
      await writeFile(join(temporary, 'profile.json'), JSON.stringify(next, null, 2), {
        encoding: 'utf8',
        flag: 'wx'
      })
      await rename(target, backup)
      backupMoved = true
      await rename(temporary, target)
      replacementMoved = true
      await this.#writeIndex(
        profiles.map((profile) => (profile.id === current.id ? next : profile))
      )
      indexCommitted = true
      try {
        await rm(backup, { recursive: true })
      } catch {
        console.error('Voice profile update cleanup failed')
      }
      return next
    } catch (error) {
      await rm(temporary, { recursive: true, force: true })
      if (!indexCommitted && backupMoved) {
        if (replacementMoved) await rm(target, { recursive: true, force: true })
        await rename(backup, target)
      }
      throw error
    }
  }

  #isProfile(value: unknown): value is VoiceProfileSummary {
    if (typeof value !== 'object' || value === null) return false
    const profile = value as Partial<VoiceProfileSummary>
    return (
      PROFILE_ID.test(profile.id ?? '') &&
      typeof profile.name === 'string' &&
      typeof profile.createdAt === 'string' &&
      typeof profile.updatedAt === 'string' &&
      PROFILE_ID.test(profile.revisionId ?? '') &&
      profile.modelVersion === 'cosyvoice2-0.5b'
    )
  }

  async #writeIndex(profiles: VoiceProfileSummary[]): Promise<void> {
    await mkdir(this.#root, { recursive: true })
    const temporary = join(this.#root, `.index-${randomUUID()}.tmp`)
    await writeFile(temporary, JSON.stringify(profiles, null, 2), { encoding: 'utf8', flag: 'wx' })
    await rename(temporary, this.#indexPath())
  }

  async #recoverQuarantined(profiles: VoiceProfileSummary[]): Promise<void> {
    const entries = await readdir(this.#root, { withFileTypes: true })
    const indexedIds = new Set(profiles.map((profile) => profile.id))
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith('.deleting-')) continue
      const id = entry.name.slice('.deleting-'.length, '.deleting-'.length + 36)
      if (!PROFILE_ID.test(id)) continue
      const quarantined = join(this.#root, entry.name)
      if (indexedIds.has(id)) {
        await rename(quarantined, join(this.#root, id))
      } else {
        await rm(quarantined, { recursive: true })
      }
    }
  }

  async #recoverUpdates(profiles: VoiceProfileSummary[]): Promise<void> {
    const entries = await readdir(this.#root, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('.updating-new-')) {
        await rm(join(this.#root, entry.name), { recursive: true })
        continue
      }
      if (!entry.isDirectory() || !entry.name.startsWith('.updating-old-')) continue
      const id = entry.name.slice('.updating-old-'.length, '.updating-old-'.length + 36)
      if (!PROFILE_ID.test(id)) continue
      const expected = profiles.find((profile) => profile.id === id)
      const backup = join(this.#root, entry.name)
      const target = join(this.#root, id)
      let targetMatchesIndex = false
      if (expected) {
        try {
          const metadata: unknown = JSON.parse(await readFile(join(target, 'profile.json'), 'utf8'))
          targetMatchesIndex =
            this.#isProfile(metadata) && metadata.revisionId === expected.revisionId
        } catch {
          targetMatchesIndex = false
        }
      }
      if (targetMatchesIndex) {
        await rm(backup, { recursive: true })
      } else {
        await rm(target, { recursive: true, force: true })
        await rename(backup, target)
      }
    }
  }

  async #recoverCreates(profiles: VoiceProfileSummary[]): Promise<void> {
    const indexedIds = new Set(profiles.map((profile) => profile.id))
    const entries = await readdir(this.#root, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (entry.name.startsWith('.creating-')) {
        await rm(join(this.#root, entry.name), { recursive: true })
      } else if (PROFILE_ID.test(entry.name) && !indexedIds.has(entry.name)) {
        await rm(join(this.#root, entry.name), { recursive: true })
      }
    }
  }
}

// 所有读取、崩溃恢复与写入共享一个队列，避免恢复逻辑碰到正在提交的目录。
export class VoiceProfileRepository {
  readonly #store: VoiceProfileStore
  #queue = Promise.resolve()

  constructor(root: string) {
    this.#store = new VoiceProfileStore(root)
  }

  list(): Promise<VoiceProfileSummary[]> {
    return this.#serialize(() => this.#store.list())
  }

  create(input: CreateVoiceProfile): Promise<VoiceProfileSummary> {
    return this.#serialize(() => this.#store.create(input))
  }

  remove(id: string, activeProfileIds: ReadonlySet<string>): Promise<void> {
    return this.#serialize(() => this.#store.remove(id, activeProfileIds))
  }

  renameProfile(
    id: string,
    name: string,
    activeProfileIds: ReadonlySet<string>
  ): Promise<VoiceProfileSummary> {
    return this.#serialize(() => this.#store.renameProfile(id, name, activeProfileIds))
  }

  replaceProfile(
    id: string,
    input: ReplaceVoiceProfile,
    activeProfileIds: ReadonlySet<string>
  ): Promise<VoiceProfileSummary> {
    return this.#serialize(() => this.#store.replaceProfile(id, input, activeProfileIds))
  }

  getArtifactPath(
    id: string,
    artifact: 'reference.wav' | 'transcript.txt' | 'features.bin'
  ): Promise<string> {
    return this.#serialize(() => this.#store.getArtifactPath(id, artifact))
  }

  #serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.#queue.then(operation)
    this.#queue = result.then(
      () => undefined,
      () => undefined
    )
    return result
  }
}
