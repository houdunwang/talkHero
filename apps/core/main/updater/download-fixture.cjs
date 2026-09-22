// 下载协议测试夹具：仅合成文件和 loopback 服务，复用真实 updater 的下载与校验实现。
const { createHash } = require('node:crypto')
const { once } = require('node:events')
const { mkdtemp, mkdir, readFile, writeFile, rm } = require('node:fs/promises')
const { readFileSync } = require('node:fs')
const { createServer, request } = require('node:http')
const { createRequire } = require('node:module')
const { tmpdir } = require('node:os')
const { join, resolve } = require('node:path')
const { gzipSync } = require('node:zlib')
const updaterRequire = createRequire(require.resolve('electron-updater'))
const { load, dump } = updaterRequire('js-yaml')
const { CancellationToken, CURRENT_APP_INSTALLER_FILE_NAME } =
  updaterRequire('builder-util-runtime')
const { createClient } = require('electron-updater/out/providerFactory')
const { NsisUpdater } = require('electron-updater/out/NsisUpdater')
const { ElectronHttpExecutor } = require('electron-updater/out/electronHttpExecutor')
const {
  GenericDifferentialDownloader
} = require('electron-updater/out/differentialDownloader/GenericDifferentialDownloader')

// Node 测试只替换 HTTP 传输入口；下载流、Range、回退和摘要验证仍由依赖执行。
class LocalHttpExecutor extends ElectronHttpExecutor {
  createRequest(options, callback) {
    return request(options, callback)
  }
}

const projectRoot = resolve(__dirname, '../../../..')
const configurations = {
  development: () => load(readFileSync(join(projectRoot, 'dev-app-update.yml'), 'utf8')),
  packaged: () => load(readFileSync(join(projectRoot, 'electron-builder.yml'), 'utf8')).publish
}
const oldBlocks = ['AAAA', 'BBBB', 'CCCC', 'DDDD']
const newBlocks = ['AAAA', 'XXXX', 'CCCC', 'YYYY']
const expected = Buffer.from(newBlocks.join(''))
const sha512 = createHash('sha512').update(expected).digest('base64')
const blockMap = (blocks) => ({
  version: '2',
  files: [
    {
      name: 'file',
      offset: 0,
      checksums: blocks.map((block) => createHash('sha256').update(block).digest('hex')),
      sizes: blocks.map((block) => Buffer.byteLength(block))
    }
  ]
})

async function createDownloadFixture({
  configuration = 'development',
  rejectRanges = false,
  rejectFull = false,
  corruptFull = false,
  oldCache = true,
  executor = new LocalHttpExecutor(),
  Updater = NsisUpdater,
  extension = 'exe'
} = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'talkhero-updater-test-'))
  const requests = []
  const logs = []
  const logger = Object.fromEntries(
    ['info', 'warn', 'error'].map((level) => [level, (message) => logs.push(String(message))])
  )
  const server = createServer((req, res) => {
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname
    const range = req.headers.range
    requests.push({ pathname, range })
    if (pathname.endsWith('.blockmap')) {
      res.end(
        gzipSync(JSON.stringify(blockMap(pathname.includes('1.0.0') ? oldBlocks : newBlocks)))
      )
      return
    }
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Accept-Ranges', 'bytes')
    if ((range && rejectRanges) || (!range && rejectFull)) {
      res.writeHead(503)
      res.end('fixture download unavailable')
      return
    }
    // 重现只支持单段 Range 的服务：多段请求返回普通 ZIP 内容。
    if (range && !range.includes(',')) {
      const [, startText, endText] = /^bytes=(\d+)-(\d+)$/.exec(range)
      const start = Number(startText)
      const end = Number(endText)
      const body = expected.subarray(start, end + 1)
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${expected.length}`,
        'Content-Length': body.length
      })
      res.end(body)
      return
    }
    const body = corruptFull ? Buffer.alloc(expected.length, 0) : expected
    res.writeHead(200, { 'Content-Length': body.length })
    res.end(body)
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const url = `http://127.0.0.1:${server.address().port}/`
  const config = { ...configurations[configuration](), url, updaterCacheDirName: 'cache' }
  const configPath = join(directory, 'app-update.yml')
  await writeFile(configPath, dump(config))
  await mkdir(join(directory, 'cache'))
  const oldFile = join(
    directory,
    'cache',
    extension === 'zip' ? 'update.zip' : CURRENT_APP_INSTALLER_FILE_NAME
  )
  if (oldCache) await writeFile(oldFile, oldBlocks.join(''))
  const unexpectedInstall = () => {
    throw new Error('Fixture must never install or quit')
  }
  const updater = new Updater(null, {
    version: '1.0.0',
    name: 'download-fixture',
    isPackaged: true,
    appUpdateConfigPath: configPath,
    userDataPath: directory,
    baseCachePath: directory,
    whenReady: async () => {},
    quit: unexpectedInstall,
    relaunch: unexpectedInstall,
    onQuit: unexpectedInstall
  })
  updater.httpExecutor = executor
  updater.logger = logger
  updater.autoInstallOnAppQuit = false
  updater.autoDownload = false
  updater.disableWebInstaller = true
  const provider = createClient(config, updater, {
    executor,
    platform: extension === 'zip' ? 'darwin' : 'win32'
  })
  const fileUrl = new URL(`update-2.0.0.${extension}`, url)
  updater.updateInfoAndProvider = {
    provider,
    info: { version: '2.0.0', files: [{ url: fileUrl.href, size: expected.length, sha512 }] }
  }
  return {
    requests,
    logs,
    expected,
    updater,
    async differential() {
      const newFile = join(directory, 'differential.zip')
      await new GenericDifferentialDownloader({ size: expected.length, sha512 }, executor, {
        oldFile,
        newFile,
        newUrl: fileUrl,
        logger,
        isUseMultipleRangeRequest: provider.isUseMultipleRangeRequest,
        requestHeaders: null,
        cancellationToken: new CancellationToken()
      }).download(blockMap(oldBlocks), blockMap(newBlocks))
      return readFile(newFile)
    },
    async dispose() {
      updater.removeAllListeners()
      // macOS 验证只下载，关闭依赖为 Squirrel 准备的本地代理，不调用安装入口。
      if (extension === 'zip') updater.closeServerIfExists()
      server.closeAllConnections()
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      )
      await rm(directory, { recursive: true, force: true })
    }
  }
}

module.exports = { createDownloadFixture }
