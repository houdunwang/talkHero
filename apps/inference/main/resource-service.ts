import { app } from 'electron'
import { lstat, realpath } from 'node:fs/promises'
import { join, relative } from 'node:path'
import type { ManagedResourceName } from '../types/public'
import { verifyResourceManifest, type ResourceTrust } from './resource-manifest'
import { MANAGED_RESOURCE_PACKAGES } from './resource-catalog'
import { resolveManagedPath } from './contracts'

const RESOURCE_PATHS: Readonly<Record<ManagedResourceName, string>> = {
  python: 'runtime/python',
  cosyvoice2: 'models/cosyvoice2-0.5b',
  'muse-talk': 'models/muse-talk-1.5',
  asr: 'models/faster-whisper-small',
  ffmpeg: 'runtime/ffmpeg',
  browser: 'runtime/browser'
}

// 许可证、官方来源与发布哈希完成审计前保持空表，所有外部资源 fail-closed。
const TRUSTED_RESOURCES: Partial<Record<ManagedResourceName, ResourceTrust>> = Object.fromEntries(
  MANAGED_RESOURCE_PACKAGES.map((resource) => [
    resource.name,
    {
      version: resource.version,
      source: resource.source,
      licenseName: resource.licenseName,
      licenseUrl: resource.licenseUrl,
      commercialUse: resource.commercialUse,
      redistribution: resource.redistribution,
      files: Object.fromEntries(resource.files.map((file) => [file.path, file.sha256]))
    }
  ])
)

export const getManagedResourceStatuses = async (
  root = join(app.getPath('userData'), 'talkhero')
) =>
  Promise.all(
    Object.entries(RESOURCE_PATHS).map(async ([name, path]) => {
      const resourceName = name as ManagedResourceName
      const resource = MANAGED_RESOURCE_PACKAGES.find((candidate) => candidate.name === name)
      let installed = false
      try {
        if ((await lstat(root)).isSymbolicLink()) throw new Error('受管资源根路径无效')
        const trustedRoot = await realpath(root)
        const resourceRoot = join(root, path)
        if ((await lstat(resourceRoot)).isSymbolicLink()) throw new Error('受管资源路径无效')
        const trustedResourceRoot = await realpath(resourceRoot)
        resolveManagedPath(trustedRoot, relative(trustedRoot, trustedResourceRoot))
        installed = (
          await verifyResourceManifest(resourceRoot, resourceName, TRUSTED_RESOURCES[resourceName])
        ).ok
      } catch {
        installed = false
      }
      return {
        name: resourceName,
        installed,
        version: resource?.version ?? null,
        sizeBytes: resource?.files.reduce((total, file) => total + file.sizeBytes, 0) ?? 0,
        licenseName: resource?.licenseName ?? null,
        licenseUrl: resource?.licenseUrl ?? null,
        installable: resource !== undefined
      }
    })
  )
