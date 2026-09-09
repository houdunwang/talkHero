import { createHash, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import {
  lstat,
  mkdir,
  readdir,
  realpath,
  rename,
  rm,
  stat,
  statfs,
  writeFile
} from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import type { ManagedResourceName } from '../types/public'
import { resolveManagedPath } from './contracts'
import { verifyResourceManifest, type ResourceTrust } from './resource-manifest'

export const RESOURCE_PATHS: Readonly<Record<ManagedResourceName, string>> = {
  python: 'runtime/python',
  cosyvoice2: 'models/cosyvoice2-0.5b',
  'muse-talk': 'models/muse-talk-1.5',
  asr: 'models/faster-whisper-small',
  ffmpeg: 'runtime/ffmpeg',
  browser: 'runtime/browser'
}

export type ResourcePackage = {
  name: ManagedResourceName
  version: string
  source: string
  licenseName: string
  licenseUrl: string
  commercialUse: boolean
  redistribution: boolean
  files: Array<{
    path: string
    url: string
    sha256: string
    sizeBytes: number
  }>
}

export type ResourceInstallProgress = {
  resource: ManagedResourceName
  stage: 'downloading' | 'verifying' | 'installed'
  completedBytes: number
  totalBytes: number
}

export type ResourceDownloader = (
  url: string,
  target: string,
  expectedBytes: number,
  onBytes: (downloadedBytes: number) => void,
  signal?: AbortSignal
) => Promise<void>

const sha256File = async (path: string, signal?: AbortSignal): Promise<string> => {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) {
    signal?.throwIfAborted()
    hash.update(chunk as Buffer)
  }
  signal?.throwIfAborted()
  return hash.digest('hex')
}

const validatePackage = (resource: ResourcePackage): void => {
  if (
    !resource.version.trim() ||
    new URL(resource.source).protocol !== 'https:' ||
    !resource.licenseName.trim() ||
    new URL(resource.licenseUrl).protocol !== 'https:' ||
    resource.commercialUse !== true ||
    resource.redistribution !== true ||
    resource.files.length === 0
  )
    throw new Error(
      resource.commercialUse !== true || resource.redistribution !== true
        ? '许可证不允许商业交付'
        : '受管资源清单无效'
    )
  const paths = new Set<string>()
  for (const file of resource.files) {
    if (
      !file.path ||
      paths.has(file.path) ||
      new URL(file.url).protocol !== 'https:' ||
      !/^[a-f0-9]{64}$/u.test(file.sha256) ||
      !Number.isSafeInteger(file.sizeBytes) ||
      file.sizeBytes < 1
    )
      throw new Error('受管资源文件清单无效')
    paths.add(file.path)
  }
}

const resourceTrust = (resource: ResourcePackage): ResourceTrust => ({
  version: resource.version,
  source: resource.source,
  licenseName: resource.licenseName,
  licenseUrl: resource.licenseUrl,
  commercialUse: resource.commercialUse,
  redistribution: resource.redistribution,
  files: Object.fromEntries(resource.files.map((file) => [file.path, file.sha256]))
})

const resolveSafeParent = async (managedRoot: string, target: string): Promise<string> => {
  await mkdir(managedRoot, { recursive: true })
  if ((await lstat(managedRoot)).isSymbolicLink()) throw new Error('受管资源根路径无效')
  const trustedRoot = await realpath(managedRoot)
  const parent = dirname(target)
  await mkdir(parent, { recursive: true })
  const trustedParent = await realpath(parent)
  resolveManagedPath(trustedRoot, relative(trustedRoot, trustedParent))
  return parent
}

const isVerifiedDirectory = async (path: string, resource: ResourcePackage): Promise<boolean> => {
  try {
    if ((await lstat(path)).isSymbolicLink()) return false
    return (await verifyResourceManifest(path, resource.name, resourceTrust(resource))).ok
  } catch {
    return false
  }
}

// Repairs a process exit between the two atomic directory renames before IPC is registered.
export const recoverResourcePackage = async (
  managedRoot: string,
  resource: ResourcePackage
): Promise<void> => {
  validatePackage(resource)
  const target = resolveManagedPath(managedRoot, RESOURCE_PATHS[resource.name])
  const parent = await resolveSafeParent(managedRoot, target)
  const entries = await readdir(parent, { withFileTypes: true })
  const previous = entries
    .filter((entry) => entry.name.startsWith(`.previous-${resource.name}-`))
    .map((entry) => join(parent, entry.name))
  const staging = entries
    .filter((entry) => entry.name.startsWith(`.installing-${resource.name}-`))
    .map((entry) => join(parent, entry.name))

  if (await isVerifiedDirectory(target, resource)) {
    await Promise.all(
      [...previous, ...staging].map((path) => rm(path, { recursive: true, force: true }))
    )
    return
  }

  try {
    await lstat(target)
    await rename(target, join(parent, `.invalid-${resource.name}-${randomUUID()}`))
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
  }

  let replacement: string | undefined
  for (const candidate of [...previous, ...staging]) {
    if (await isVerifiedDirectory(candidate, resource)) {
      replacement = candidate
      break
    }
  }
  if (replacement) await rename(replacement, target)
  await Promise.all(
    [...previous, ...staging]
      .filter((path) => path !== replacement)
      .map((path) => rm(path, { recursive: true, force: true }))
  )
}

// Installs one immutable resource package into a same-volume staging directory before commit.
export const installResourcePackage = async (
  managedRoot: string,
  resource: ResourcePackage,
  download: ResourceDownloader,
  onProgress: (progress: ResourceInstallProgress) => void,
  signal?: AbortSignal
): Promise<ResourceTrust> => {
  validatePackage(resource)
  const target = resolveManagedPath(managedRoot, RESOURCE_PATHS[resource.name])
  const parent = await resolveSafeParent(managedRoot, target)
  const revision = randomUUID()
  const staging = join(parent, `.installing-${resource.name}-${revision}`)
  const previous = join(parent, `.previous-${resource.name}-${revision}`)
  const totalBytes = resource.files.reduce((total, file) => total + file.sizeBytes, 0)
  if (!Number.isSafeInteger(totalBytes)) throw new Error('受管资源大小无效')
  let completedBytes = 0
  let movedPrevious = false
  let installedNew = false
  let committed = false
  const disk = await statfs(parent)
  if (disk.bavail * disk.bsize < totalBytes) throw new Error('磁盘空间不足，无法安装受管资源')
  await mkdir(staging)
  try {
    for (const file of resource.files) {
      signal?.throwIfAborted()
      const destination = resolveManagedPath(staging, file.path)
      await mkdir(dirname(destination), { recursive: true })
      onProgress({ resource: resource.name, stage: 'downloading', completedBytes, totalBytes })
      await download(
        file.url,
        destination,
        file.sizeBytes,
        (downloadedBytes) => {
          if (
            !Number.isSafeInteger(downloadedBytes) ||
            downloadedBytes < 0 ||
            downloadedBytes > file.sizeBytes
          )
            throw new Error('资源下载大小超出清单')
          onProgress({
            resource: resource.name,
            stage: 'downloading',
            completedBytes: completedBytes + downloadedBytes,
            totalBytes
          })
        },
        signal
      )
      signal?.throwIfAborted()
      const downloaded = await stat(destination)
      if (
        downloaded.size !== file.sizeBytes ||
        (await sha256File(destination, signal)) !== file.sha256
      ) {
        throw new Error('资源哈希不匹配')
      }
      signal?.throwIfAborted()
      completedBytes += file.sizeBytes
    }

    onProgress({ resource: resource.name, stage: 'verifying', completedBytes, totalBytes })
    signal?.throwIfAborted()
    await writeFile(
      join(staging, 'manifest.json'),
      JSON.stringify({
        schemaVersion: 1,
        resource: resource.name,
        version: resource.version,
        source: resource.source,
        license: {
          name: resource.licenseName,
          url: resource.licenseUrl,
          commercialUse: resource.commercialUse,
          redistribution: resource.redistribution
        },
        files: resource.files.map(({ path, sha256 }) => ({ path, sha256 }))
      }),
      { encoding: 'utf8', flag: 'wx' }
    )
    signal?.throwIfAborted()
    const trust = resourceTrust(resource)
    const verified = await verifyResourceManifest(staging, resource.name, trust, signal)
    if (!verified.ok) throw new Error(verified.reason)
    signal?.throwIfAborted()

    try {
      await rename(target, previous)
      movedPrevious = true
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
    }
    signal?.throwIfAborted()
    await rename(staging, target)
    installedNew = true
    signal?.throwIfAborted()
    committed = true
    if (movedPrevious) {
      void rm(previous, { recursive: true, force: true }).catch(() => {
        console.error('受管资源旧版本清理失败', resource.name)
      })
    }
    onProgress({ resource: resource.name, stage: 'installed', completedBytes, totalBytes })
    return trust
  } catch (error) {
    if (installedNew && !committed) {
      await rm(target, { recursive: true, force: true })
      if (movedPrevious) await rename(previous, target)
    } else if (movedPrevious && !committed) {
      await rename(previous, target)
    }
    await rm(staging, { recursive: true, force: true })
    throw error
  }
}
