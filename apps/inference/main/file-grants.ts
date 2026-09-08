import { randomUUID } from 'node:crypto'
import { realpath, stat } from 'node:fs/promises'

export type FileGrantPurpose = 'voice-reference' | 'video-source' | 'publish-video'
export type FileGrant = { id: string; displayName: string; expiresAt: number }

type StoredGrant = FileGrant & {
  path: string
  clientId: number
  purpose: FileGrantPurpose
  identity: { dev: number; ino: number; size: number; mtimeMs: number }
}

// FileGrantRegistry 把系统文件对话框选择绑定到 renderer、用途和一次性令牌。
export class FileGrantRegistry {
  readonly #grants = new Map<string, StoredGrant>()
  readonly #now: () => number
  readonly #ttlMs: number

  constructor(now: () => number = Date.now, ttlMs = 30 * 60_000) {
    this.#now = now
    this.#ttlMs = ttlMs
  }

  get size(): number {
    return this.#grants.size
  }

  async issue(path: string, clientId: number, purpose: FileGrantPurpose): Promise<FileGrant> {
    const canonicalPath = await realpath(path)
    const selected = await stat(canonicalPath)
    if (!selected.isFile()) throw new Error('选择项不是文件')
    const id = randomUUID()
    const grant: StoredGrant = {
      id,
      path: canonicalPath,
      displayName: canonicalPath.split(/[\\/]/u).at(-1) ?? 'media',
      clientId,
      purpose,
      identity: {
        dev: selected.dev,
        ino: selected.ino,
        size: selected.size,
        mtimeMs: selected.mtimeMs
      },
      expiresAt: this.#now() + this.#ttlMs
    }
    this.#grants.set(id, grant)
    return { id, displayName: grant.displayName, expiresAt: grant.expiresAt }
  }

  async consume(id: string, clientId: number, purpose: FileGrantPurpose): Promise<string | null> {
    const grant = this.#grants.get(id)
    if (!grant) return null
    if (grant.expiresAt < this.#now()) {
      this.#grants.delete(id)
      return null
    }
    if (grant.clientId !== clientId || grant.purpose !== purpose) return null
    this.#grants.delete(id)
    try {
      const canonicalPath = await realpath(grant.path)
      const current = await stat(canonicalPath)
      if (
        canonicalPath !== grant.path ||
        current.dev !== grant.identity.dev ||
        current.ino !== grant.identity.ino ||
        current.size !== grant.identity.size ||
        current.mtimeMs !== grant.identity.mtimeMs
      )
        return null
      return canonicalPath
    } catch {
      return null
    }
  }

  disposeClient(clientId: number): void {
    for (const [id, grant] of this.#grants) {
      if (grant.clientId === clientId) this.#grants.delete(id)
    }
  }
}

export const fileGrants = new FileGrantRegistry()
