import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readFile, realpath } from 'node:fs/promises'
import { join, relative } from 'node:path'
import type { ManagedResourceName } from '../types/public'
import { resolveManagedPath } from './contracts'

type Verification = { ok: true; version: string } | { ok: false; reason: string }
export type ResourceTrust = {
  version: string
  source: string
  files: Readonly<Record<string, string>>
}

const digestFile = (path: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const digest = createHash('sha256')
    const stream = createReadStream(path)
    stream.on('data', (chunk) => digest.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(digest.digest('hex')))
  })

export const verifyResourceManifest = async (
  resourceRoot: string,
  expectedResource: ManagedResourceName,
  trust: ResourceTrust | undefined
): Promise<Verification> => {
  if (!trust) return { ok: false, reason: '资源尚无内置信任锚' }
  try {
    const value: unknown = JSON.parse(await readFile(join(resourceRoot, 'manifest.json'), 'utf8'))
    if (typeof value !== 'object' || value === null) return { ok: false, reason: 'manifest 无效' }
    const manifest = value as Record<string, unknown>
    if (
      manifest.schemaVersion !== 1 ||
      manifest.resource !== expectedResource ||
      manifest.version !== trust.version ||
      manifest.source !== trust.source ||
      new URL(trust.source).protocol !== 'https:' ||
      !Array.isArray(manifest.files) ||
      manifest.files.length === 0
    ) {
      return { ok: false, reason: 'manifest 契约不匹配' }
    }
    for (const item of manifest.files) {
      if (typeof item !== 'object' || item === null) return { ok: false, reason: '文件清单无效' }
      const file = item as Record<string, unknown>
      if (
        typeof file.path !== 'string' ||
        typeof file.sha256 !== 'string' ||
        !/^[a-f0-9]{64}$/u.test(file.sha256) ||
        trust.files[file.path] !== file.sha256
      ) {
        return { ok: false, reason: '文件清单无效' }
      }
      const realRoot = await realpath(resourceRoot)
      const realFile = await realpath(resolveManagedPath(resourceRoot, file.path))
      resolveManagedPath(realRoot, relative(realRoot, realFile))
      const actual = await digestFile(realFile)
      if (actual !== file.sha256) return { ok: false, reason: '资源哈希不匹配' }
    }
    if (Object.keys(trust.files).length !== manifest.files.length) {
      return { ok: false, reason: '资源文件清单不完整' }
    }
    return { ok: true, version: manifest.version }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : '资源校验失败' }
  }
}
