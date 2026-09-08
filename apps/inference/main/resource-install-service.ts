import { app, net } from 'electron'
import { createWriteStream } from 'node:fs'
import { join } from 'node:path'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ResourceInstallSnapshot } from '../types/public'
import { MANAGED_RESOURCE_PACKAGES } from './resource-catalog'
import {
  installResourcePackage,
  recoverResourcePackage,
  type ResourceDownloader
} from './resource-installer'
import { getManagedResourceStatuses } from './resource-service'

const managedRoot = (): string => join(app.getPath('userData'), 'talkhero')

const download: ResourceDownloader = async (url, target, expectedBytes, onBytes, signal) => {
  const response = await net.fetch(url, { signal })
  if (!response.ok || !response.body) throw new Error(`资源下载失败：HTTP ${response.status}`)
  let downloadedBytes = 0
  const progress = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      downloadedBytes += chunk.length
      if (downloadedBytes > expectedBytes) {
        callback(new Error('资源下载大小超出清单'))
        return
      }
      onBytes(downloadedBytes)
      callback(null, chunk)
    }
  })
  await pipeline(
    Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]),
    progress,
    createWriteStream(target, { flags: 'wx' }),
    { signal }
  )
}

class ManagedResourceInstallService {
  #controller: AbortController | null = null
  #run: Promise<ResourceInstallSnapshot> | null = null
  #snapshot: ResourceInstallSnapshot = {
    state: MANAGED_RESOURCE_PACKAGES.length ? 'idle' : 'unavailable',
    currentResource: null,
    completedBytes: 0,
    totalBytes: MANAGED_RESOURCE_PACKAGES.reduce(
      (total, resource) =>
        total + resource.files.reduce((resourceTotal, file) => resourceTotal + file.sizeBytes, 0),
      0
    ),
    message: MANAGED_RESOURCE_PACKAGES.length
      ? '可以安装应用受管资源'
      : '资源发布清单尚未完成来源、哈希与许可证审计'
  }

  getSnapshot(): ResourceInstallSnapshot {
    return { ...this.#snapshot }
  }

  async initialize(): Promise<void> {
    for (const resource of MANAGED_RESOURCE_PACKAGES) {
      try {
        await recoverResourcePackage(managedRoot(), resource)
      } catch {
        console.error('受管资源安装恢复失败', resource.name)
        this.#snapshot = {
          ...this.#snapshot,
          state: 'failed',
          currentResource: resource.name,
          message: `${resource.name}：资源安装恢复失败`
        }
      }
    }
  }

  start(): Promise<ResourceInstallSnapshot> {
    if (!MANAGED_RESOURCE_PACKAGES.length) throw new Error(this.#snapshot.message)
    if (this.#controller) throw new Error('资源安装正在进行')
    const controller = new AbortController()
    this.#controller = controller
    this.#snapshot = {
      ...this.#snapshot,
      state: 'running',
      currentResource: null,
      completedBytes: 0,
      message: '正在安装应用受管资源'
    }
    const run = this.#install(controller).finally(() => {
      if (this.#run === run) this.#run = null
      if (this.#controller === controller) this.#controller = null
    })
    this.#run = run
    return run
  }

  async #install(controller: AbortController): Promise<ResourceInstallSnapshot> {
    let completedBefore = 0
    try {
      const installed = new Map(
        (await getManagedResourceStatuses(managedRoot())).map((resource) => [
          resource.name,
          resource.installed
        ])
      )
      controller.signal.throwIfAborted()
      for (const resource of MANAGED_RESOURCE_PACKAGES) {
        controller.signal.throwIfAborted()
        const resourceBytes = resource.files.reduce((total, file) => total + file.sizeBytes, 0)
        if (installed.get(resource.name)) {
          completedBefore += resourceBytes
          this.#snapshot = {
            ...this.#snapshot,
            completedBytes: completedBefore,
            message: `${resource.name}：复用已校验资源`
          }
          controller.signal.throwIfAborted()
          continue
        }
        await installResourcePackage(
          managedRoot(),
          resource,
          download,
          (progress) => {
            this.#snapshot = {
              ...this.#snapshot,
              currentResource: progress.resource,
              completedBytes: completedBefore + progress.completedBytes,
              message: `${progress.resource}：${progress.stage}`
            }
          },
          controller.signal
        )
        completedBefore += resourceBytes
      }
      controller.signal.throwIfAborted()
      this.#snapshot = {
        ...this.#snapshot,
        state: 'completed',
        currentResource: null,
        completedBytes: this.#snapshot.totalBytes,
        message: '应用受管资源安装完成'
      }
    } catch (error) {
      const cancelled = controller.signal.aborted
      this.#snapshot = {
        ...this.#snapshot,
        state: cancelled ? 'cancelled' : 'failed',
        currentResource: null,
        message: cancelled
          ? '资源安装已取消'
          : error instanceof Error
            ? error.message
            : '资源安装失败'
      }
    }
    return this.getSnapshot()
  }

  cancel(): ResourceInstallSnapshot {
    if (!this.#controller) throw new Error('当前没有进行中的资源安装')
    this.#controller.abort()
    return this.getSnapshot()
  }

  async shutdown(): Promise<void> {
    this.#controller?.abort()
    await this.#run
  }
}

export const resourceInstallService = new ManagedResourceInstallService()
