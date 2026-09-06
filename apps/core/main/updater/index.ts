import { is } from '@electron-toolkit/utils'
import { app, dialog } from 'electron'
import { autoUpdater } from 'electron-updater'
import { existsSync, readdirSync, rmSync, statSync } from 'fs'
import { join } from 'path'
import { configStore } from '../config'
import { showSystemNotification } from '../notification'
import { windowsList } from '../window'
import { registerUpdaterIpc } from './ipc'
import { UpdaterState, UPDATER_CHANNELS } from './type'

let updaterState = createInitialState()
const AUTO_CHECK_INTERVAL_MS = 10 * 60 * 1000
let autoCheckTimer: NodeJS.Timeout | undefined

export function getUpdaterState(): Readonly<UpdaterState> {
  return updaterState
}

function checkForUpdatesInBackground() {
  if (['available', 'downloading', 'downloaded'].includes(updaterState.status)) {
    return
  }

  autoUpdater.checkForUpdates().catch(() => {
    setUpdaterState({
      status: 'error',
      downloadProgress: null,
      canInstallUpdate: false,
      message: '检查更新失败，请稍后重试。',
      lastCheckedAt: Date.now()
    })
  })
}

/** 清理旧的 electron-updater 缓存文件，避免堆积导致启动扫描变慢 */
function cleanUpdaterCache() {
  try {
    const cacheDir = join(app.getPath('userData'), 'electron-updater')

    if (!existsSync(cacheDir)) return

    const entries = readdirSync(cacheDir, { withFileTypes: true })
    const now = Date.now()
    // 清理 7 天前的缓存文件
    const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

    for (const entry of entries) {
      const fullPath = join(cacheDir, entry.name)
      try {
        const stat = statSync(fullPath)
        if (now - stat.mtimeMs > EXPIRY_MS) {
          rmSync(fullPath, { recursive: true, force: true })
        }
      } catch {
        // 忽略单个文件清理失败
      }
    }
  } catch {
    // 忽略缓存清理失败
  }
}

export const initUpdater = () => {
  // 仅在开发环境强制使用 dev-app-update.yml
  autoUpdater.forceDevUpdateConfig = is.dev
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.autoRunAppAfterInstall = true

  registerUpdaterIpc()

  // 异步清理旧的更新缓存文件，避免阻塞启动
  setImmediate(() => cleanUpdaterCache())

  autoUpdater.on('checking-for-update', () => {
    setUpdaterState({
      status: 'checking',
      availableVersion: null,
      downloadProgress: null,
      canInstallUpdate: false,
      message: '正在检查更新...',
      lastCheckedAt: Date.now(),
      releaseDate: null
    })
  })

  // 有新版本
  autoUpdater.on('update-available', (info) => {
    setUpdaterState({
      status: 'available',
      availableVersion: info.version,
      releaseDate: info.releaseDate,
      message: `发现新版本 ${info.version}，正在后台下载...`,
      lastCheckedAt: Date.now()
    })
  })

  //没有新版本时
  autoUpdater.on('update-not-available', (info) => {
    setUpdaterState({
      status: 'not-available',
      downloadProgress: null,
      canInstallUpdate: false,
      message: '当前版本已为新版本',
      availableVersion: info.version,
      releaseDate: info.releaseDate,
      lastCheckedAt: Date.now()
    })
  })

  //更新发生错误
  autoUpdater.on('error', (error) => {
    console.error('Auto updater error:', error)
    setUpdaterState({
      status: 'error',
      message: `更新失败: ${error.message}`,
      lastCheckedAt: Date.now()
    })
  })

  // 监听下载进度
  autoUpdater.on('download-progress', (progress) => {
    setUpdaterState({
      status: 'downloading',
      downloadProgress: progress.percent
    })
  })

  autoUpdater.on('update-downloaded', async (info) => {
    setUpdaterState({
      status: 'downloaded',
      availableVersion: info.version,
      downloadProgress: 100,
      canInstallUpdate: true,
      message: `新版本 ${info.version} 已下载完成，可立即安装`,
      lastCheckedAt: Date.now()
    })
    showSystemNotification('更新已下载完成', `新版本 ${info.version} 已准备就绪。`)

    try {
      const { response } = await dialog.showMessageBox({
        type: 'info',
        title: '安装更新',
        buttons: ['立即安装', '稍后'],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
        message: `新版本 ${info.version} 已下载完成`,
        detail: '软件将关闭并在后台自动安装更新，完成后将重新打开。'
      })

      if (response === 0) {
        handleQuitAndInstall()
      }
    } catch (error) {
      console.error('Failed to show update dialog:', error)
      // 对话框弹出失败时，用户仍可通过更新页面手动安装
    }
  })

  // 如果配置了不自动检查更新，则跳过后续的定时检查（IPC 已注册，用户仍可手动检查）
  if (!configStore.get('autoCheckUpdate', true)) {
    return
  }

  // 启动后延迟检查更新，如果刚刚完成更新安装则跳过自动检查
  const UPDATER_LAST_VERSION_KEY = '_updater_lastInstalledVersion'
  const currentVersion = app.getVersion()
  const lastInstalledVersion = configStore.get(UPDATER_LAST_VERSION_KEY) as string | null

  if (lastInstalledVersion === currentVersion) {
    // 刚刚完成更新安装，清除标记并跳过自动检查
    configStore.remove(UPDATER_LAST_VERSION_KEY)
    setUpdaterState({
      status: 'not-available',
      message: '应用已更新到最新版本',
      lastCheckedAt: Date.now()
    })
  } else {
    // 首次启动或非更新后启动，延迟 5 秒后自动检查
    setTimeout(checkForUpdatesInBackground, 5000)
  }

  if (!autoCheckTimer) {
    autoCheckTimer = setInterval(checkForUpdatesInBackground, AUTO_CHECK_INTERVAL_MS)
  }
}

function createInitialState() {
  return {
    status: 'idle',
    currentVersion: app.getVersion(),
    availableVersion: null,
    downloadProgress: null,
    canInstallUpdate: false,
    message: '准备检查更新...',
    lastCheckedAt: null,
    releaseDate: null
  } as UpdaterState
}

export function setUpdaterState(partialState: Partial<UpdaterState>) {
  const nextState = {
    ...updaterState,
    ...partialState
  }
  updaterState = nextState
  broadcastState()
}

function broadcastState() {
  windowsList.forEach((config) => {
    const win = config.win
    if (win && !win.isDestroyed()) {
      win.webContents.send(UPDATER_CHANNELS.STATE_CHANGED, updaterState)
    }
  })
}

/**
 * 处理退出并安装更新
 */
export function handleQuitAndInstall() {
  // 记录当前安装的版本号，下次启动时可跳过自动检查
  if (updaterState.availableVersion) {
    configStore.set('_updater_lastInstalledVersion', updaterState.availableVersion)
  }

  setUpdaterState({
    message: '正在退出应用并安装更新，安装完成后将自动重新打开软件...'
  })

  // 静默安装更新，减少安装器 UI 启动开销
  autoUpdater.quitAndInstall(true, true)
}
