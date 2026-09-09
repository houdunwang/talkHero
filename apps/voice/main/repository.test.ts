import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { VoiceProfileRepository } from './repository'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('VoiceProfileRepository', () => {
  it('commits a complete profile atomically and never stores the original B video', async () => {
    const root = await mkdtemp(join(tmpdir(), 'talkhero-voice-'))
    roots.push(root)
    const source = join(root, 'worker-audio.wav')
    const features = join(root, 'worker-features.bin')
    await writeFile(source, 'audio')
    await writeFile(features, 'features')
    const repository = new VoiceProfileRepository(join(root, 'voices'))

    const profile = await repository.create({
      id: '123e4567-e89b-42d3-a456-426614174000',
      name: '授权音色',
      referenceAudioPath: source,
      transcript: '这是自动转写文本',
      featuresPath: features
    })

    expect(profile.modelVersion).toBe('cosyvoice2-0.5b')
    expect((await repository.list()).map((item) => item.id)).toEqual([profile.id])
    expect(await readFile(join(root, 'voices', profile.id, 'reference.wav'), 'utf8')).toBe('audio')
    expect(await readFile(join(root, 'voices', profile.id, 'transcript.txt'), 'utf8')).toBe(
      '这是自动转写文本'
    )
    expect(await readFile(join(root, 'voices', profile.id, 'features.bin'), 'utf8')).toBe(
      'features'
    )
  })

  it('refuses deletion while referenced and removes all managed artifacts otherwise', async () => {
    const root = await mkdtemp(join(tmpdir(), 'talkhero-voice-'))
    roots.push(root)
    const source = join(root, 'worker-audio.wav')
    const features = join(root, 'worker-features.bin')
    await writeFile(source, 'audio')
    await writeFile(features, 'features')
    const repository = new VoiceProfileRepository(join(root, 'voices'))
    const id = '123e4567-e89b-42d3-a456-426614174001'
    await repository.create({
      id,
      name: '音色',
      referenceAudioPath: source,
      transcript: '文本',
      featuresPath: features
    })

    await expect(repository.remove(id, new Set([id]))).rejects.toThrow('运行中任务正在使用该音色')
    await repository.remove(id, new Set())
    expect(await repository.list()).toEqual([])
  })

  it('reconciles a deletion quarantine after a process crash', async () => {
    const root = await mkdtemp(join(tmpdir(), 'talkhero-voice-'))
    roots.push(root)
    const voiceRoot = join(root, 'voices')
    const source = join(root, 'worker-audio.wav')
    const features = join(root, 'worker-features.bin')
    await writeFile(source, 'audio')
    await writeFile(features, 'features')
    const repository = new VoiceProfileRepository(voiceRoot)
    const id = '123e4567-e89b-42d3-a456-426614174002'
    await repository.create({
      id,
      name: '崩溃恢复音色',
      referenceAudioPath: source,
      transcript: '文本',
      featuresPath: features
    })
    await rename(join(voiceRoot, id), join(voiceRoot, `.deleting-${id}-crash`))

    expect((await repository.list()).map((profile) => profile.id)).toEqual([id])
    expect(await readFile(join(voiceRoot, id, 'reference.wav'), 'utf8')).toBe('audio')

    await rename(join(voiceRoot, id), join(voiceRoot, `.deleting-${id}-committed`))
    await writeFile(join(voiceRoot, 'index.json'), '[]')
    expect(await repository.list()).toEqual([])
    await expect(
      readFile(join(voiceRoot, `.deleting-${id}-committed`, 'reference.wav'))
    ).rejects.toMatchObject({
      code: 'ENOENT'
    })
  })

  it('renames a profile and atomically replaces its derived artifacts', async () => {
    const root = await mkdtemp(join(tmpdir(), 'talkhero-voice-'))
    roots.push(root)
    const source = join(root, 'source.wav')
    const features = join(root, 'source.bin')
    const nextSource = join(root, 'next.wav')
    const nextFeatures = join(root, 'next.bin')
    await Promise.all([
      writeFile(source, 'old-audio'),
      writeFile(features, 'old-features'),
      writeFile(nextSource, 'new-audio'),
      writeFile(nextFeatures, 'new-features')
    ])
    const repository = new VoiceProfileRepository(join(root, 'voices'))
    const id = '123e4567-e89b-42d3-a456-426614174003'
    const created = await repository.create({
      id,
      name: '旧名称',
      referenceAudioPath: source,
      transcript: '旧文本',
      featuresPath: features
    })

    const renamed = await repository.renameProfile(id, '新名称', new Set())
    expect(renamed).toMatchObject({ id, name: '新名称', createdAt: created.createdAt })
    const updated = await repository.replaceProfile(
      id,
      {
        name: '更新音色',
        referenceAudioPath: nextSource,
        transcript: '新文本',
        featuresPath: nextFeatures
      },
      new Set()
    )
    expect(updated).toMatchObject({ id, name: '更新音色', createdAt: created.createdAt })
    expect(await readFile(join(root, 'voices', id, 'reference.wav'), 'utf8')).toBe('new-audio')
    expect(await readFile(join(root, 'voices', id, 'transcript.txt'), 'utf8')).toBe('新文本')
  })

  it('keeps the previous profile when replacement preparation fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'talkhero-voice-'))
    roots.push(root)
    const source = join(root, 'source.wav')
    const features = join(root, 'source.bin')
    await writeFile(source, 'old-audio')
    await writeFile(features, 'old-features')
    const repository = new VoiceProfileRepository(join(root, 'voices'))
    const id = '123e4567-e89b-42d3-a456-426614174004'
    await repository.create({
      id,
      name: '保留音色',
      referenceAudioPath: source,
      transcript: '旧文本',
      featuresPath: features
    })

    await expect(
      repository.replaceProfile(
        id,
        {
          name: '不应保存',
          referenceAudioPath: join(root, 'missing.wav'),
          transcript: '新文本',
          featuresPath: features
        },
        new Set()
      )
    ).rejects.toThrow()
    expect((await repository.list())[0].name).toBe('保留音色')
    expect(await readFile(join(root, 'voices', id, 'reference.wav'), 'utf8')).toBe('old-audio')
    await expect(
      repository.replaceProfile(
        id,
        {
          name: '运行中更新',
          referenceAudioPath: source,
          transcript: '文本',
          featuresPath: features
        },
        new Set([id])
      )
    ).rejects.toThrow('运行中任务正在使用该音色')
  })

  it('restores the indexed profile after a crash during replacement', async () => {
    const root = await mkdtemp(join(tmpdir(), 'talkhero-voice-'))
    roots.push(root)
    const voiceRoot = join(root, 'voices')
    const source = join(root, 'source.wav')
    const features = join(root, 'source.bin')
    await writeFile(source, 'old-audio')
    await writeFile(features, 'old-features')
    const repository = new VoiceProfileRepository(voiceRoot)
    const id = '123e4567-e89b-42d3-a456-426614174005'
    await repository.create({
      id,
      name: '索引中的音色',
      referenceAudioPath: source,
      transcript: '旧文本',
      featuresPath: features
    })
    const backup = join(voiceRoot, `.updating-old-${id}-crash`)
    await rename(join(voiceRoot, id), backup)
    await repository.list()

    expect(await readFile(join(voiceRoot, id, 'reference.wav'), 'utf8')).toBe('old-audio')
  })

  it('serializes concurrent creates so neither profile is lost from the index', async () => {
    const root = await mkdtemp(join(tmpdir(), 'talkhero-voice-'))
    roots.push(root)
    const source = join(root, 'source.wav')
    const features = join(root, 'source.bin')
    await writeFile(source, 'audio')
    await writeFile(features, 'features')
    const repository = new VoiceProfileRepository(join(root, 'voices'))
    const ids = ['123e4567-e89b-42d3-a456-426614174006', '123e4567-e89b-42d3-a456-426614174007']

    await Promise.all(
      ids.map((id, index) =>
        repository.create({
          id,
          name: `音色${index}`,
          referenceAudioPath: source,
          transcript: '文本',
          featuresPath: features
        })
      )
    )

    expect((await repository.list()).map((profile) => profile.id).sort()).toEqual(ids)
    await Promise.all(
      ids.map((id) =>
        expect(readFile(join(root, 'voices', id, 'reference.wav'))).resolves.toBeTruthy()
      )
    )
  })

  it('removes unindexed create artifacts during recovery', async () => {
    const root = await mkdtemp(join(tmpdir(), 'talkhero-voice-'))
    roots.push(root)
    const voiceRoot = join(root, 'voices')
    await writeFile(join(root, 'source.wav'), 'audio')
    await writeFile(join(root, 'source.bin'), 'features')
    const repository = new VoiceProfileRepository(voiceRoot)
    await repository.create({
      id: '123e4567-e89b-42d3-a456-426614174008',
      name: '已有音色',
      referenceAudioPath: join(root, 'source.wav'),
      transcript: '文本',
      featuresPath: join(root, 'source.bin')
    })
    const orphan = join(voiceRoot, '123e4567-e89b-42d3-a456-426614174009')
    await writeFile(join(voiceRoot, 'index.json'), JSON.stringify(await repository.list()))
    await mkdir(orphan)
    await writeFile(join(orphan, 'reference.wav'), 'sensitive')

    await repository.list()
    await expect(readFile(join(orphan, 'reference.wav'))).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
