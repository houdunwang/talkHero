import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { FileGrantRegistry } from './file-grants'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('FileGrantRegistry', () => {
  it('binds an explicit file selection to one client, purpose and consumption', async () => {
    const root = await mkdtemp(join(tmpdir(), 'talkhero-grant-'))
    roots.push(root)
    const file = join(root, 'reference.mp4')
    await writeFile(file, 'video')
    const registry = new FileGrantRegistry(() => 1_000)
    const grant = await registry.issue(file, 7, 'voice-reference')
    expect(await registry.consume(grant.id, 8, 'voice-reference')).toBeNull()
    expect(await registry.consume(grant.id, 7, 'video-source')).toBeNull()
    expect(await registry.consume(grant.id, 7, 'voice-reference')).toBe(await realpath(file))
    expect(await registry.consume(grant.id, 7, 'voice-reference')).toBeNull()
  })

  it('expires grants and clears every grant owned by a destroyed renderer', async () => {
    const root = await mkdtemp(join(tmpdir(), 'talkhero-grant-'))
    roots.push(root)
    const file = join(root, 'source.mp4')
    await writeFile(file, 'video')
    let now = 1_000
    const registry = new FileGrantRegistry(() => now, 500)
    const expired = await registry.issue(file, 7, 'video-source')
    now = 1_501
    expect(await registry.consume(expired.id, 7, 'video-source')).toBeNull()
    await registry.issue(file, 7, 'video-source')
    registry.disposeClient(7)
    expect(registry.size).toBe(0)
  })

  it('rejects a selected file that was replaced before consumption', async () => {
    const root = await mkdtemp(join(tmpdir(), 'talkhero-grant-'))
    roots.push(root)
    const file = join(root, 'source.mp4')
    await writeFile(file, 'first')
    const registry = new FileGrantRegistry()
    const grant = await registry.issue(file, 7, 'video-source')
    await rm(file)
    await writeFile(file, 'replacement')
    expect(await registry.consume(grant.id, 7, 'video-source')).toBeNull()
  })
})
