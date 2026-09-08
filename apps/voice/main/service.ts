import { app } from 'electron'
import { randomUUID } from 'node:crypto'
import { readFile, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fileGrants } from '@apps/inference/main/file-grants'
import { runWorkerTask } from '@apps/inference/main/worker-runtime'
import type {
  CreateVoiceRequest,
  GeneratedAudio,
  RenameVoiceRequest,
  SynthesizeVoiceRequest,
  UpdateVoiceRequest,
  VoiceLibrarySnapshot,
  VoicePreview,
  VoiceProfileSummary
} from '../types/public'
import { validateScript } from './contracts'
import { VoiceProfileRepository } from './repository'
import { ProfileUsageCounter } from './profile-usage'

const isProfile = (value: unknown): value is VoiceProfileSummary => {
  if (typeof value !== 'object' || value === null) return false
  const profile = value as Partial<VoiceProfileSummary>
  return (
    typeof profile.id === 'string' &&
    typeof profile.name === 'string' &&
    typeof profile.createdAt === 'string' &&
    typeof profile.updatedAt === 'string' &&
    typeof profile.revisionId === 'string' &&
    profile.modelVersion === 'index-tts-2.5'
  )
}

const root = (): string => join(app.getPath('userData'), 'talkhero')
let profileRepository: VoiceProfileRepository | null = null
const repository = (): VoiceProfileRepository =>
  (profileRepository ??= new VoiceProfileRepository(join(root(), 'voices')))
const profileUsage = new ProfileUsageCounter()
let voiceMutationQueue = Promise.resolve()
const serializeVoiceMutation = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = voiceMutationQueue.then(operation)
  voiceMutationQueue = result.then(
    () => undefined,
    () => undefined
  )
  return result
}

export const getVoiceLibrarySnapshot = async (): Promise<VoiceLibrarySnapshot> => {
  try {
    const parsed = await repository().list()
    if (!parsed.every(isProfile)) throw new Error('音色索引损坏')
    return {
      profiles: parsed,
      available: true,
      message: parsed.length ? '音色档案仅保存在本机' : '还没有本地音色档案'
    }
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : ''
    if (code !== 'ENOENT')
      console.error(
        'Voice library read failed:',
        error instanceof Error ? error.message : 'unknown error'
      )
    return {
      profiles: [],
      available: code === 'ENOENT',
      message: code === 'ENOENT' ? '还没有本地音色档案' : '音色索引读取失败'
    }
  }
}

export const createVoiceProfile = async (
  clientId: number,
  input: CreateVoiceRequest
): Promise<VoiceProfileSummary> => {
  if (!input.authorized) throw new Error('必须先确认已获得人脸与人声授权')
  const name = input.name.trim()
  if (!name || [...name].length > 40) throw new Error('音色名称必须为 1～40 个字符')
  const sourceVideo = await fileGrants.consume(input.grantId, clientId, 'voice-reference')
  if (!sourceVideo) throw new Error('文件授权无效、已使用或已过期')
  const taskId = randomUUID()
  const profileId = randomUUID()
  const outputDir = join(root(), 'voices', `.worker-${taskId}`)
  try {
    return await runWorkerTask(taskId, 'voice.create', { sourceVideo, outputDir }, async () => {
      const referenceAudioPath = join(outputDir, 'reference.wav')
      const transcriptPath = join(outputDir, 'transcript.txt')
      const featuresPath = join(outputDir, 'features.json')
      const transcript = await readFile(transcriptPath, 'utf8')
      return serializeVoiceMutation(() =>
        repository().create({
          id: profileId,
          name,
          referenceAudioPath,
          transcript,
          featuresPath
        })
      )
    })
  } finally {
    await rm(outputDir, { recursive: true, force: true })
  }
}

export const synthesizeVoice = async (input: SynthesizeVoiceRequest): Promise<GeneratedAudio> => {
  const validation = validateScript(input.text, input.speed)
  if (!validation.ok) throw new Error(validation.reason)
  const { referenceAudio, releaseProfile } = await serializeVoiceMutation(async () => ({
    referenceAudio: await repository().getArtifactPath(input.profileId, 'reference.wav'),
    releaseProfile: profileUsage.acquire(input.profileId)
  }))
  const taskId = randomUUID()
  const outputPath = join(root(), 'outputs', 'audio', `${taskId}.wav`)
  try {
    return await runWorkerTask(
      taskId,
      'voice.synthesize',
      {
        referenceAudio,
        text: input.text.trim(),
        speed: input.speed,
        emotion: input.emotion,
        outputAudio: outputPath
      },
      async () => {
        if ((await stat(outputPath)).size === 0) throw new Error('音频输出为空')
        return { taskId, previewUrl: `talkhero-media://audio/${taskId}/output.wav` }
      }
    )
  } finally {
    releaseProfile()
  }
}

export const deleteVoiceProfile = async (profileId: string): Promise<void> =>
  serializeVoiceMutation(() => repository().remove(profileId, profileUsage.activeIds()))

export const renameVoiceProfile = async (input: RenameVoiceRequest): Promise<VoiceProfileSummary> =>
  serializeVoiceMutation(() =>
    repository().renameProfile(input.profileId, input.name, profileUsage.activeIds())
  )

export const updateVoiceProfile = async (
  clientId: number,
  input: UpdateVoiceRequest
): Promise<VoiceProfileSummary> => {
  if (!input.authorized) throw new Error('必须先确认已获得人脸与人声授权')
  const sourceVideo = await fileGrants.consume(input.grantId, clientId, 'voice-reference')
  if (!sourceVideo) throw new Error('文件授权无效、已使用或已过期')
  const taskId = randomUUID()
  const outputDir = join(root(), 'voices', `.worker-${taskId}`)
  try {
    return await runWorkerTask(taskId, 'voice.create', { sourceVideo, outputDir }, async () => {
      const transcript = await readFile(join(outputDir, 'transcript.txt'), 'utf8')
      return serializeVoiceMutation(() =>
        repository().replaceProfile(
          input.profileId,
          {
            name: input.name,
            referenceAudioPath: join(outputDir, 'reference.wav'),
            transcript,
            featuresPath: join(outputDir, 'features.json')
          },
          profileUsage.activeIds()
        )
      )
    })
  } finally {
    await rm(outputDir, { recursive: true, force: true })
  }
}

export const getVoicePreview = async (profileId: string): Promise<VoicePreview> => {
  await repository().getArtifactPath(profileId, 'reference.wav')
  return { profileId, previewUrl: `talkhero-media://voice/${profileId}/reference.wav` }
}
