import { app, nativeImage } from 'electron'
import { execFile } from 'node:child_process'
import { access, mkdir, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { extname, join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const iconCache = new Map<string, Promise<string>>()

// macOS 的 app.getFileIcon 对 .app 目录经常返回空图标，
// 因此优先从 bundle 的 Info.plist 读取 CFBundleIconFile 并转成 PNG。
const loadMacBundleIcon = async (appPath: string): Promise<string> => {
  if (process.platform !== 'darwin' || extname(appPath).toLowerCase() !== '.app') return ''

  const resourcesPath = join(appPath, 'Contents', 'Resources')
  const plistPath = join(appPath, 'Contents', 'Info.plist')
  let iconName = ''
  try {
    const { stdout } = await execFileAsync('/usr/bin/plutil', [
      '-extract',
      'CFBundleIconFile',
      'raw',
      '-o',
      '-',
      plistPath
    ])
    iconName = stdout.trim()
  } catch {
    // 部分应用只在 Resources 里提供图标文件
  }

  const candidates = iconName
    ? [iconName, extname(iconName) ? '' : `${iconName}.icns`].filter(Boolean)
    : []
  if (!candidates.length) {
    const resources = await readdir(resourcesPath).catch(() => [])
    const fallback = resources.find((file) => extname(file).toLowerCase() === '.icns')
    if (fallback) candidates.push(fallback)
  }

  let sourcePath = ''
  for (const candidate of candidates) {
    const path = join(resourcesPath, candidate)
    if (
      await access(path)
        .then(() => true)
        .catch(() => false)
    ) {
      sourcePath = path
      break
    }
  }
  if (!sourcePath) return ''

  const cacheDirectory = join(app.getPath('userData'), 'app-icons')
  const cacheName = createHash('sha256').update(appPath).digest('hex')
  const outputPath = join(cacheDirectory, `${cacheName}.png`)
  await mkdir(cacheDirectory, { recursive: true })
  await execFileAsync('/usr/bin/sips', [
    '-s',
    'format',
    'png',
    '-z',
    '64',
    '64',
    sourcePath,
    '--out',
    outputPath
  ])

  const image = nativeImage.createFromPath(outputPath)
  return image.isEmpty() ? '' : image.toDataURL()
}

export const loadAppIcon = (appPath: string): Promise<string> => {
  let icon = iconCache.get(appPath)
  if (!icon) {
    icon = loadMacBundleIcon(appPath)
      .then(async (bundleIcon) => {
        if (bundleIcon) return bundleIcon
        const image = await app.getFileIcon(appPath, { size: 'normal' })
        return image.isEmpty() ? '' : image.toDataURL()
      })
      .catch(() => '')
    iconCache.set(appPath, icon)
  }
  return icon
}
