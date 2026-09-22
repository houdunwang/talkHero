import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { createDownloadFixture } = createRequire(import.meta.url)('./download-fixture.cjs')
let fixture: Awaited<ReturnType<typeof createDownloadFixture>>

afterEach(async () => {
  await fixture.dispose()
})

describe('更新下载协议', () => {
  it.each(['development', 'packaged'])(
    '%s 配置通过单段 Range 重建多个差分片段',
    async (configuration) => {
      fixture = await createDownloadFixture({ configuration })
      expect(await fixture.differential()).toEqual(fixture.expected)
      expect(fixture.requests.map(({ range }) => range)).toEqual(['bytes=4-7', 'bytes=12-15'])
    }
  )

  it.each([
    { scenario: '差分请求失败', rejectRanges: true },
    { scenario: '没有旧安装包', oldCache: false }
  ])('$scenario 时回退完整下载并报告完成', async (options) => {
    fixture = await createDownloadFixture(options)
    const downloaded = vi.fn()
    fixture.updater.on('update-downloaded', downloaded)
    const [file] = await fixture.updater.downloadUpdate()
    expect(await readFile(file)).toEqual(fixture.expected)
    expect(fixture.logs.join('\n')).toContain('fallback to full download')
    expect(fixture.requests).toContainEqual({ pathname: '/update-2.0.0.exe', range: undefined })
    expect(downloaded).toHaveBeenCalledOnce()
  })

  it.each([
    { scenario: '完整下载失败', rejectFull: true, error: /503/ },
    { scenario: '完整下载摘要不符', corruptFull: true, error: /sha512 checksum mismatch/ }
  ])('$scenario 时拒绝下载并上报错误，不发出完成事件', async ({ error, ...options }) => {
    fixture = await createDownloadFixture({ ...options, rejectRanges: true })
    const downloaded = vi.fn()
    const failed = vi.fn()
    fixture.updater.on('update-downloaded', downloaded)
    fixture.updater.on('error', failed)
    await expect(fixture.updater.downloadUpdate()).rejects.toThrow(error)
    expect(failed).toHaveBeenCalledOnce()
    expect(downloaded).not.toHaveBeenCalled()
  })
})
