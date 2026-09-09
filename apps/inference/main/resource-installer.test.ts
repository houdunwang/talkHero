import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { installResourcePackage, recoverResourcePackage } from './resource-installer'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('managed resource installer', () => {
  it('rejects resources whose existing license does not directly permit commercial redistribution', async () => {
    const root = await mkdtemp(join(tmpdir(), 'talkhero-install-'))
    roots.push(root)
    let downloaded = false

    await expect(
      installResourcePackage(
        root,
        {
          name: 'asr',
          version: 'test',
          source: 'https://example.com/asr',
          licenseName: 'CC-BY-NC-4.0',
          licenseUrl: 'https://example.com/license',
          commercialUse: false,
          redistribution: true,
          files: [
            {
              path: 'model.bin',
              url: 'https://example.com/model.bin',
              sha256: '0'.repeat(64),
              sizeBytes: 1
            }
          ]
        },
        async () => {
          downloaded = true
        },
        () => undefined
      )
    ).rejects.toThrow('许可证不允许商业交付')

    expect(downloaded).toBe(false)
  })

  it('downloads a fixed package, verifies hashes and commits it atomically', async () => {
    const root = await mkdtemp(join(tmpdir(), 'talkhero-install-'))
    roots.push(root)
    const content = Buffer.from('managed python runtime')
    const sha256 = createHash('sha256').update(content).digest('hex')
    const stages: string[] = []

    await installResourcePackage(
      root,
      {
        name: 'python',
        version: '3.11-test',
        source: 'https://www.python.org/downloads/release/python-3119/',
        licenseName: 'PSF-2.0',
        licenseUrl: 'https://docs.python.org/3/license.html',
        commercialUse: true,
        redistribution: true,
        files: [
          {
            path: 'python.exe',
            url: 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip',
            sha256,
            sizeBytes: content.length
          }
        ]
      },
      async (_url, target, expectedBytes, onBytes) => {
        expect(expectedBytes).toBe(content.length)
        await writeFile(target, content)
        onBytes(content.length)
      },
      (progress) => stages.push(progress.stage)
    )

    expect(await readFile(join(root, 'runtime/python/python.exe'), 'utf8')).toBe(
      'managed python runtime'
    )
    expect(
      JSON.parse(await readFile(join(root, 'runtime/python/manifest.json'), 'utf8'))
    ).toMatchObject({ schemaVersion: 1, resource: 'python', version: '3.11-test' })
    expect(stages).toEqual(expect.arrayContaining(['downloading', 'verifying', 'installed']))
  })

  it('reports byte progress while a file is downloading', async () => {
    const root = await mkdtemp(join(tmpdir(), 'talkhero-install-'))
    roots.push(root)
    const content = Buffer.from('progressive resource')
    const sha256 = createHash('sha256').update(content).digest('hex')
    const completed: number[] = []

    await installResourcePackage(
      root,
      {
        name: 'asr',
        version: 'test',
        source: 'https://example.com/asr',
        licenseName: 'MIT',
        licenseUrl: 'https://example.com/license',
        commercialUse: true,
        redistribution: true,
        files: [
          {
            path: 'model.bin',
            url: 'https://example.com/model.bin',
            sha256,
            sizeBytes: content.length
          }
        ]
      },
      async (_url, target, _expectedBytes, onBytes) => {
        await writeFile(target, content)
        onBytes(5)
        onBytes(content.length)
      },
      (progress) => completed.push(progress.completedBytes)
    )

    expect(completed).toContain(5)
    expect(completed).toContain(content.length)
  })

  it('does not expose a partial install when a downloaded file fails verification', async () => {
    const root = await mkdtemp(join(tmpdir(), 'talkhero-install-'))
    roots.push(root)

    await expect(
      installResourcePackage(
        root,
        {
          name: 'ffmpeg',
          version: 'test',
          source: 'https://ffmpeg.org/',
          licenseName: 'LGPL-2.1-or-later',
          licenseUrl: 'https://ffmpeg.org/legal.html',
          commercialUse: true,
          redistribution: true,
          files: [
            {
              path: 'ffmpeg.exe',
              url: 'https://example.invalid/ffmpeg.exe',
              sha256: '0'.repeat(64),
              sizeBytes: 4
            }
          ]
        },
        async (_url, target) => writeFile(target, 'bad'),
        () => undefined
      )
    ).rejects.toThrow('资源哈希不匹配')

    await expect(readFile(join(root, 'runtime/ffmpeg/ffmpeg.exe'))).rejects.toThrow()
  })

  it('stops before downloading when the package cannot fit on disk', async () => {
    const root = await mkdtemp(join(tmpdir(), 'talkhero-install-'))
    roots.push(root)
    let downloaded = false

    await expect(
      installResourcePackage(
        root,
        {
          name: 'browser',
          version: 'test',
          source: 'https://example.com/browser',
          licenseName: 'Test',
          licenseUrl: 'https://example.com/license',
          commercialUse: true,
          redistribution: true,
          files: [
            {
              path: 'browser.exe',
              url: 'https://example.com/browser.exe',
              sha256: '0'.repeat(64),
              sizeBytes: Number.MAX_SAFE_INTEGER
            }
          ]
        },
        async () => {
          downloaded = true
        },
        () => undefined
      )
    ).rejects.toThrow('磁盘空间不足')

    expect(downloaded).toBe(false)
  })

  it('does not commit when cancellation arrives during verification', async () => {
    const root = await mkdtemp(join(tmpdir(), 'talkhero-install-'))
    roots.push(root)
    const content = Buffer.from('cancel during verification')
    const controller = new AbortController()

    await expect(
      installResourcePackage(
        root,
        {
          name: 'python',
          version: 'test',
          source: 'https://example.com/python',
          licenseName: 'Test',
          licenseUrl: 'https://example.com/license',
          commercialUse: true,
          redistribution: true,
          files: [
            {
              path: 'python.exe',
              url: 'https://example.com/python.exe',
              sha256: createHash('sha256').update(content).digest('hex'),
              sizeBytes: content.length
            }
          ]
        },
        async (_url, target) => writeFile(target, content),
        (progress) => {
          if (progress.stage === 'verifying') controller.abort()
        },
        controller.signal
      )
    ).rejects.toThrow()

    await expect(readFile(join(root, 'runtime/python/python.exe'))).rejects.toThrow()
  })

  it.skipIf(process.platform === 'win32')(
    'rejects an install parent that resolves outside the managed root',
    async () => {
      const root = await mkdtemp(join(tmpdir(), 'talkhero-install-'))
      const outside = await mkdtemp(join(tmpdir(), 'talkhero-outside-'))
      roots.push(root, outside)
      await symlink(outside, join(root, 'runtime'), 'dir')
      const content = Buffer.from('must stay managed')

      await expect(
        installResourcePackage(
          root,
          {
            name: 'python',
            version: 'test',
            source: 'https://example.com/python',
            licenseName: 'Test',
            licenseUrl: 'https://example.com/license',
            commercialUse: true,
            redistribution: true,
            files: [
              {
                path: 'python.exe',
                url: 'https://example.com/python.exe',
                sha256: createHash('sha256').update(content).digest('hex'),
                sizeBytes: content.length
              }
            ]
          },
          async (_url, target) => writeFile(target, content),
          () => undefined
        )
      ).rejects.toThrow('路径越界')

      await expect(readFile(join(outside, 'python', 'python.exe'))).rejects.toThrow()
    }
  )

  it.skipIf(process.platform === 'win32')(
    'rejects a managed root that is itself a symbolic link',
    async () => {
      const parent = await mkdtemp(join(tmpdir(), 'talkhero-parent-'))
      const outside = await mkdtemp(join(tmpdir(), 'talkhero-outside-'))
      const root = join(parent, 'talkhero')
      roots.push(parent, outside)
      await symlink(outside, root, 'dir')
      const content = Buffer.from('must not follow root')

      await expect(
        installResourcePackage(
          root,
          {
            name: 'python',
            version: 'test',
            source: 'https://example.com/python',
            licenseName: 'Test',
            licenseUrl: 'https://example.com/license',
            commercialUse: true,
            redistribution: true,
            files: [
              {
                path: 'python.exe',
                url: 'https://example.com/python.exe',
                sha256: createHash('sha256').update(content).digest('hex'),
                sizeBytes: content.length
              }
            ]
          },
          async (_url, target) => writeFile(target, content),
          () => undefined
        )
      ).rejects.toThrow('受管资源根路径无效')

      await expect(readFile(join(outside, 'runtime/python/python.exe'))).rejects.toThrow()
    }
  )

  it('restores a verified previous directory left between atomic renames', async () => {
    const root = await mkdtemp(join(tmpdir(), 'talkhero-install-'))
    roots.push(root)
    const content = Buffer.from('verified previous resource')
    const sha256 = createHash('sha256').update(content).digest('hex')
    const resource = {
      name: 'python' as const,
      version: 'test',
      source: 'https://example.com/python',
      licenseName: 'Test',
      licenseUrl: 'https://example.com/license',
      commercialUse: true,
      redistribution: true,
      files: [
        {
          path: 'python.exe',
          url: 'https://example.com/python.exe',
          sha256,
          sizeBytes: content.length
        }
      ]
    }
    const previous = join(root, 'runtime', '.previous-python-00000000-0000-4000-8000-000000000000')
    await mkdir(previous, { recursive: true })
    await writeFile(join(previous, 'python.exe'), content)
    await writeFile(
      join(previous, 'manifest.json'),
      JSON.stringify({
        schemaVersion: 1,
        resource: 'python',
        version: 'test',
        source: resource.source,
        license: {
          name: resource.licenseName,
          url: resource.licenseUrl,
          commercialUse: true,
          redistribution: true
        },
        files: [{ path: 'python.exe', sha256 }]
      })
    )

    await recoverResourcePackage(root, resource)

    expect(await readFile(join(root, 'runtime/python/python.exe'), 'utf8')).toBe(
      'verified previous resource'
    )
  })
})
