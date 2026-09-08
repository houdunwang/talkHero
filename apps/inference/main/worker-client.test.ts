import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { WorkerClient } from './worker-client'

const fixture = join(import.meta.dirname, 'fixtures', 'fake-worker.cjs')

describe('WorkerClient', () => {
  it('requires a versioned ready handshake and forwards progress to completion', async () => {
    const client = new WorkerClient({
      executable: process.execPath,
      args: [fixture],
      handshakeTimeoutMs: 1_000
    })
    await client.start()
    const progress: number[] = []
    const result = await client.run(
      { taskId: 'job-1', operation: 'test.complete', payload: {} },
      (message) => progress.push(message.progress)
    )
    expect(progress).toEqual([25, 80])
    expect(result).toEqual({ outputPath: 'managed/output.wav' })
    await client.stop()
  })

  it('rejects every pending task when the worker crashes', async () => {
    const client = new WorkerClient({
      executable: process.execPath,
      args: [fixture],
      handshakeTimeoutMs: 1_000
    })
    await client.start()
    await expect(
      client.run({ taskId: 'job-crash', operation: 'test.crash', payload: {} })
    ).rejects.toThrow('Worker 异常退出')
    expect(client.running).toBe(false)
  })

  it('treats malformed output as a protocol failure', async () => {
    const client = new WorkerClient({
      executable: process.execPath,
      args: [fixture],
      handshakeTimeoutMs: 1_000
    })
    await client.start()
    await expect(
      client.run({ taskId: 'job-bad', operation: 'test.malformed', payload: {} })
    ).rejects.toThrow('Worker 协议错误')
    expect(client.running).toBe(false)
  })

  it('sends a controlled cancellation and waits for the worker terminal state', async () => {
    const client = new WorkerClient({
      executable: process.execPath,
      args: [fixture],
      handshakeTimeoutMs: 1_000
    })
    await client.start()
    const pending = client.run({ taskId: 'job-cancel', operation: 'test.wait', payload: {} })
    await client.cancel('job-cancel')
    await expect(pending).rejects.toThrow('任务已取消')
    await client.stop()
  })

  it('turns a progress consumer failure into a task failure instead of crashing main', async () => {
    const client = new WorkerClient({
      executable: process.execPath,
      args: [fixture],
      handshakeTimeoutMs: 1_000
    })
    await client.start()
    await expect(
      client.run({ taskId: 'job-progress-error', operation: 'test.complete', payload: {} }, () => {
        throw new Error('progress rejected')
      })
    ).rejects.toThrow('Worker 进度处理失败')
    expect(client.running).toBe(false)
  })

  it('terminates an unresponsive worker when cancellation has no terminal response', async () => {
    const client = new WorkerClient({
      executable: process.execPath,
      args: [fixture],
      handshakeTimeoutMs: 1_000
    })
    await client.start()
    const pending = client.run({
      taskId: 'job-ignore-cancel',
      operation: 'test.ignore-cancel',
      payload: {}
    })
    await expect(client.cancel('job-ignore-cancel', 50)).rejects.toThrow('取消超时')
    await expect(pending).rejects.toThrow('取消超时')
    expect(client.running).toBe(false)
  })
})
