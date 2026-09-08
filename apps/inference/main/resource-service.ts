import { app } from 'electron'
import { join } from 'node:path'
import type { ManagedResourceName } from '../types/public'
import { verifyResourceManifest, type ResourceTrust } from './resource-manifest'

const RESOURCE_PATHS: Readonly<Record<ManagedResourceName, string>> = {
  python: 'runtime/python',
  'index-tts': 'models/index-tts-2.5',
  'muse-talk': 'models/muse-talk-1.5',
  asr: 'models/faster-whisper-small',
  ffmpeg: 'runtime/ffmpeg',
  browser: 'runtime/browser'
}

// 许可证、官方来源与发布哈希完成审计前保持空表，所有外部资源 fail-closed。
const TRUSTED_RESOURCES: Partial<Record<ManagedResourceName, ResourceTrust>> = {}

export const getManagedResourceStatuses = async (
  root = join(app.getPath('userData'), 'talkhero')
) =>
  Promise.all(
    Object.entries(RESOURCE_PATHS).map(async ([name, path]) => ({
      name: name as ManagedResourceName,
      installed: (
        await verifyResourceManifest(
          join(root, path),
          name as ManagedResourceName,
          TRUSTED_RESOURCES[name as ManagedResourceName]
        )
      ).ok
    }))
  )
