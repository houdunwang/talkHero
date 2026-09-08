import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { verifyResourceManifest } from './resource-manifest'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('verifyResourceManifest', () => {
  it('requires matching versioned HTTPS metadata and file hashes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'talkhero-resource-'))
    roots.push(root)
    const content = 'trusted resource'
    await writeFile(join(root, 'runtime.bin'), content)
    const sha256 = createHash('sha256').update(content).digest('hex')
    await writeFile(
      join(root, 'manifest.json'),
      JSON.stringify({
        schemaVersion: 1,
        resource: 'python',
        version: '3.12.10',
        source: 'https://www.python.org/',
        files: [{ path: 'runtime.bin', sha256 }]
      })
    )
    const trust = {
      version: '3.12.10',
      source: 'https://www.python.org/',
      files: { 'runtime.bin': sha256 }
    }
    expect(await verifyResourceManifest(root, 'python', trust)).toEqual({
      ok: true,
      version: '3.12.10'
    })
    await writeFile(join(root, 'runtime.bin'), 'tampered')
    expect((await verifyResourceManifest(root, 'python', trust)).ok).toBe(false)
    expect(await verifyResourceManifest(root, 'python', undefined)).toEqual({
      ok: false,
      reason: '资源尚无内置信任锚'
    })
  })
})
