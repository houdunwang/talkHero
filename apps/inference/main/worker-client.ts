import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createInterface } from 'node:readline'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { PROTOCOL_VERSION, parseWorkerMessage, type WorkerMessage } from './contracts'

export type WorkerOperation =
  | 'environment.health'
  | 'voice.create'
  | 'voice.synthesize'
  | 'video.inspect'
  | 'video.lipsync'
  | 'publish.cover'
  | `test.${string}`

export type WorkerRequest = {
  taskId: string
  operation: WorkerOperation
  payload: Record<string, unknown>
}

type PendingTask = {
  resolve: (output: Record<string, string>) => void
  reject: (error: Error) => void
  onProgress?: (message: Extract<WorkerMessage, { type: 'progress' }>) => unknown | Promise<unknown>
  cancellation?: {
    resolve: () => void
    reject: (error: Error) => void
    timer: ReturnType<typeof setTimeout>
  }
}

type WorkerClientOptions = {
  executable: string
  args: string[]
  cwd?: string
  env?: NodeJS.ProcessEnv
  handshakeTimeoutMs?: number
}

// WorkerClient 是 Electron main 启动本地 AI 进程的唯一结构化协议边界。
export class WorkerClient {
  readonly #options: WorkerClientOptions
  readonly #pending = new Map<string, PendingTask>()
  #process: ChildProcessWithoutNullStreams | null = null
  #starting: Promise<void> | null = null
  #messageQueue = Promise.resolve()
  #poisonedError: Error | null = null
  #stopping = false

  constructor(options: WorkerClientOptions) {
    this.#options = options
  }

  get running(): boolean {
    // `killed` only means a signal was sent; the process may still be alive.
    return this.#process !== null && this.#process.exitCode === null
  }

  start(): Promise<void> {
    if (this.#poisonedError) return Promise.reject(this.#poisonedError)
    if (this.running) return Promise.resolve()
    if (this.#starting) return this.#starting
    this.#stopping = false
    this.#starting = new Promise<void>((resolve, reject) => {
      const child = spawn(this.#options.executable, this.#options.args, {
        cwd: this.#options.cwd,
        env: this.#options.env,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: process.platform !== 'win32',
        windowsHide: true
      })
      this.#process = child
      let ready = false
      const timer = setTimeout(() => {
        if (ready) return
        this.#terminate(new Error('Worker 握手超时'))
        reject(new Error('Worker 握手超时'))
      }, this.#options.handshakeTimeoutMs ?? 15_000)

      createInterface({ input: child.stdout }).on('line', (line) => {
        let message: WorkerMessage
        try {
          message = parseWorkerMessage(JSON.parse(line))
        } catch {
          clearTimeout(timer)
          const error = new Error('Worker 协议错误')
          this.#terminate(error)
          if (!ready) reject(error)
          return
        }
        if (message.type === 'ready') {
          if (ready) {
            this.#terminate(new Error('Worker 重复握手'))
            return
          }
          ready = true
          clearTimeout(timer)
          resolve()
          return
        }
        this.#messageQueue = this.#messageQueue
          .then(() => this.#dispatch(message))
          .catch(() => this.#terminate(new Error('Worker 进度处理失败')))
      })

      child.stderr.on('data', (chunk: Buffer) => {
        if (chunk.length) {
          const diagnosticId = createHash('sha256').update(chunk).digest('hex').slice(0, 12)
          console.error(`TalkHero Worker diagnostic ${diagnosticId} (${chunk.length} bytes)`)
        }
      })
      child.once('error', (error) => {
        clearTimeout(timer)
        this.#failAll(new Error(`Worker 启动失败：${error.message}`))
        this.#process = null
        if (!ready) reject(error)
      })
      child.once('exit', (code, signal) => {
        clearTimeout(timer)
        const wasStopping = this.#stopping
        this.#process = null
        this.#starting = null
        if (!wasStopping) {
          const error = new Error(
            `Worker 异常退出（code=${code ?? 'null'}, signal=${signal ?? 'none'}）`
          )
          this.#failAll(error)
          if (!ready) reject(error)
        }
      })
    }).finally(() => {
      this.#starting = null
    })
    return this.#starting
  }

  run(
    request: WorkerRequest,
    onProgress?: PendingTask['onProgress']
  ): Promise<Record<string, string>> {
    if (!request.taskId.trim() || this.#pending.has(request.taskId))
      throw new Error('任务 ID 无效或已存在')
    return new Promise<Record<string, string>>((resolve, reject) => {
      this.#pending.set(request.taskId, { resolve, reject, onProgress })
      void this.start()
        .then(() => this.#write({ version: PROTOCOL_VERSION, type: 'run', ...request }))
        .catch((error: unknown) => {
          this.#pending.delete(request.taskId)
          reject(error instanceof Error ? error : new Error('Worker 启动失败'))
        })
    })
  }

  async cancel(taskId: string, timeoutMs = 10_000): Promise<void> {
    const pending = this.#pending.get(taskId)
    if (!pending) throw new Error('任务不存在或已结束')
    if (pending.cancellation) throw new Error('任务正在取消')
    await this.start()
    if (this.#pending.get(taskId) !== pending) throw new Error('任务已结束')
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const error = new Error('Worker 取消超时，已终止进程')
        void this.#terminateAfterKill(error)
      }, timeoutMs)
      pending.cancellation = { resolve, reject, timer }
      try {
        this.#write({ version: PROTOCOL_VERSION, type: 'cancel', taskId })
      } catch (error) {
        clearTimeout(timer)
        pending.cancellation = undefined
        reject(error instanceof Error ? error : new Error('取消请求发送失败'))
      }
    })
  }

  async stop(): Promise<void> {
    this.#stopping = true
    this.#failAll(new Error('Worker 已停止'))
    const child = this.#process
    if (!child || child.exitCode !== null) {
      this.#process = null
      return
    }
    child.stdin.end()
    await this.#killTree(child)
    if (this.#process === child) this.#process = null
    this.#poisonedError = null
  }

  async #dispatch(message: Exclude<WorkerMessage, { type: 'ready' }>): Promise<void> {
    if (this.#poisonedError) return
    const pending = this.#pending.get(message.taskId)
    if (!pending) return
    if (message.type === 'progress') {
      await pending.onProgress?.(message)
      return
    }
    this.#pending.delete(message.taskId)
    if (message.type === 'completed') {
      pending.resolve(message.output)
      if (pending.cancellation) {
        clearTimeout(pending.cancellation.timer)
        pending.cancellation.reject(new Error('任务已在取消前完成'))
      }
    } else {
      pending.reject(new Error(message.code === 'cancelled' ? '任务已取消' : message.message))
      if (pending.cancellation) {
        clearTimeout(pending.cancellation.timer)
        if (message.code === 'cancelled') pending.cancellation.resolve()
        else pending.cancellation.reject(new Error(message.message))
      }
    }
  }

  #write(message: Record<string, unknown>): void {
    if (!this.running || !this.#process) throw new Error('Worker 未运行')
    this.#process.stdin.write(`${JSON.stringify(message)}\n`)
  }

  #terminate(error: Error): void {
    void this.#terminateAfterKill(error)
  }

  #failAll(error: Error): void {
    for (const pending of this.#pending.values()) {
      pending.reject(error)
      if (pending.cancellation) {
        clearTimeout(pending.cancellation.timer)
        pending.cancellation.reject(error)
      }
    }
    this.#pending.clear()
  }

  async #terminateAfterKill(error: Error): Promise<void> {
    const child = this.#process
    this.#poisonedError = new Error('Worker 状态不可信，必须确认退出后才能重新启动')
    this.#stopping = true
    try {
      if (child && child.exitCode === null) await this.#killTree(child)
      if (this.#process === child) this.#process = null
      this.#poisonedError = null
      this.#failAll(error)
    } catch {
      // Keep a live handle so a later stop can retry cleanup instead of
      // launching another Worker beside a process whose exit is unconfirmed.
      if (child?.exitCode === null) this.#process = child
      const killError = new Error('Worker 进程树终止失败，重启应用前不可继续执行任务')
      this.#poisonedError = killError
      this.#failAll(killError)
    } finally {
      this.#stopping = false
    }
  }

  #waitForExit(child: ChildProcessWithoutNullStreams, timeoutMs: number): Promise<boolean> {
    if (child.exitCode !== null) return Promise.resolve(true)
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), timeoutMs)
      child.once('exit', () => {
        clearTimeout(timer)
        resolve(true)
      })
    })
  }

  async #killTree(child: ChildProcessWithoutNullStreams): Promise<void> {
    if (!child.pid) return
    if (process.platform === 'win32') {
      const systemRoot = process.env.SystemRoot ?? process.env.WINDIR
      if (systemRoot) {
        const code = await new Promise<number | null>((resolve, reject) => {
          const killer = spawn(
            join(systemRoot, 'System32', 'taskkill.exe'),
            ['/pid', String(child.pid), '/t', '/f'],
            { stdio: 'ignore', windowsHide: true }
          )
          killer.once('error', reject)
          killer.once('exit', resolve)
        })
        if (code === 0 && (await this.#waitForExit(child, 3_000))) return
        child.kill()
        await this.#waitForExit(child, 3_000)
        throw new Error('Worker 进程树终止失败')
      }
    } else {
      try {
        process.kill(-child.pid, 'SIGTERM')
        if (await this.#waitForExit(child, 3_000)) return
        process.kill(-child.pid, 'SIGKILL')
        if (await this.#waitForExit(child, 1_000)) return
      } catch {
        // Fall through to the direct child when its process group already exited.
      }
    }
    child.kill()
    if (!(await this.#waitForExit(child, 3_000))) throw new Error('Worker 进程终止失败')
  }
}
