const fs = require('node:fs')
const path = require('node:path')

const distPath = path.join(process.cwd(), 'dist')
const retryableErrorCodes = new Set(['ENOTEMPTY', 'EBUSY', 'EPERM'])
const retryDelays = [200, 500, 1000, 1500, 2000]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function confirmDistRemoved() {
  if (fs.existsSync(distPath)) {
    const error = new Error('删除操作结束后 dist 目录仍然存在')
    error.code = 'ENOTEMPTY'
    throw error
  }

  console.log('[clean] 已确认 dist 目录不存在')
}

// 直接删除并确认构建产物消失，失败时阻止后续编译和打包。
async function removeDist() {
  if (!fs.existsSync(distPath)) {
    confirmDistRemoved()
    return
  }

  let lastError

  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    try {
      if (!fs.existsSync(distPath)) {
        confirmDistRemoved()
        return
      }

      fs.rmSync(distPath, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 100
      })
      confirmDistRemoved()
      return
    } catch (error) {
      lastError = error

      if (!retryableErrorCodes.has(error?.code) || attempt === retryDelays.length) {
        break
      }

      await sleep(retryDelays[attempt])
    }
  }

  const reason =
    lastError?.code === 'EPERM'
      ? '没有权限删除 dist 中的文件，请检查目录所有权。'
      : lastError?.code && retryableErrorCodes.has(lastError.code)
        ? 'macOS 仍在访问打包目录；已重试但仍未成功，请稍后再试。'
        : lastError?.message || '未知错误'

  console.error(`[clean] 删除 dist 失败: ${reason}`)
  process.exit(1)
}

void removeDist()
