import { loadAppIcon } from '@apps/core/main/appIcon'
import { execFile } from 'node:child_process'
import type { Dirent } from 'node:fs'
import { access, readdir, stat } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { homedir } from 'node:os'
import { promisify } from 'node:util'

type InstalledAppSource = 'scan' | 'manual'

export type InstalledApp = {
  name: string
  path: string
  icon?: string
  aliases?: string[]
  source: InstalledAppSource
}

type InstalledAppValidationResult = {
  valid: boolean
  path: string
  name?: string
  icon?: string
  source: InstalledAppSource
  message: string
}

const isMac = process.platform === 'darwin'
const isWindows = process.platform === 'win32'
const execFileAsync = promisify(execFile)

// Finder lives outside the default scan directories on macOS.
const MAC_FINDER_PATH = '/System/Library/CoreServices/Finder.app'

const readIcon = (path: string): Promise<string> => loadAppIcon(path)

export const listInstalledApps = async (): Promise<InstalledApp[]> => {
  const scanned = isMac ? await scanMacApps() : isWindows ? await scanWindowsApps() : []
  const seen = new Set<string>()
  const deduped = scanned.filter((item) => {
    const key = item.path.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return Promise.all(
    deduped.map(async (item) => ({
      ...item,
      icon: item.icon || (await readIcon(item.path))
    }))
  )
}

export const validateInstalledAppPath = async (
  inputPath: string,
  source: InstalledAppSource = 'manual'
): Promise<InstalledAppValidationResult> => {
  const path = inputPath.trim()
  if (!path) {
    return {
      valid: false,
      path,
      source,
      message: '应用路径不能为空'
    }
  }

  try {
    await access(path)
    const fileStat = await stat(path)
    const extension = extname(path).toLowerCase()

    if (isMac) {
      if (!fileStat.isDirectory() || extension !== '.app') {
        return {
          valid: false,
          path,
          source,
          message: '请选择有效的 macOS .app 应用'
        }
      }
    } else if (
      isWindows &&
      (!fileStat.isFile() || (extension !== '.exe' && extension !== '.lnk'))
    ) {
      return {
        valid: false,
        path,
        source,
        message: '请选择有效的 Windows .exe 或 .lnk 启动入口'
      }
    } else if (!isWindows) {
      return {
        valid: false,
        path,
        source,
        message: '当前平台不支持应用扫描与启动入口'
      }
    }

    return {
      valid: true,
      path,
      name: basename(path, extension || undefined),
      icon: await readIcon(path),
      source,
      message: '路径有效'
    }
  } catch {
    return {
      valid: false,
      path,
      source,
      message: '路径不存在或当前无权访问'
    }
  }
}

async function scanMacApps(): Promise<InstalledApp[]> {
  const dirs = ['/Applications', '/System/Applications', join(homedir(), 'Applications')]
  const apps: InstalledApp[] = []

  for (const dir of dirs) {
    apps.push(...(await scanDir(dir, '.app', 2)))
  }

  try {
    await access(MAC_FINDER_PATH)
    apps.push({
      name: '访达',
      path: MAC_FINDER_PATH,
      aliases: ['Finder'],
      source: 'scan'
    })
  } catch {
    // Ignore missing Finder path.
  }

  return localizeMacAppNames(apps)
}

async function localizeMacAppNames(apps: InstalledApp[]): Promise<InstalledApp[]> {
  if (!apps.length) return apps

  try {
    const { stdout } = await execFileAsync('/usr/bin/mdls', [
      '-raw',
      '-name',
      'kMDItemDisplayName',
      ...apps.map((item) => item.path)
    ])
    const displayNames = stdout.split('\0')
    if (displayNames.length !== apps.length) return apps

    return apps.map((item, index) => {
      const displayName = displayNames[index].trim().replace(/\.app$/i, '')
      if (!displayName || displayName === '(null)' || displayName === item.name) {
        return item
      }

      return {
        ...item,
        name: displayName,
        aliases: Array.from(new Set([...(item.aliases || []), item.name]))
      }
    })
  } catch {
    return apps
  }
}

async function scanWindowsApps(): Promise<InstalledApp[]> {
  const userStartMenu = join(
    process.env['APPDATA'] || '',
    'Microsoft',
    'Windows',
    'Start Menu',
    'Programs'
  )
  const systemStartMenu = join(
    process.env['ProgramData'] || 'C:\\ProgramData',
    'Microsoft',
    'Windows',
    'Start Menu',
    'Programs'
  )
  const dirs = [
    join(process.env['ProgramFiles'] || 'C:\\Program Files'),
    join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'),
    join(process.env['LOCALAPPDATA'] || '', 'Programs'),
    userStartMenu,
    systemStartMenu
  ]
  const apps: InstalledApp[] = []

  for (const dir of dirs) {
    apps.push(...(await scanDir(dir, '.exe', 2)))
  }

  apps.push(...(await scanDir(userStartMenu, '.lnk', 3)))
  apps.push(...(await scanDir(systemStartMenu, '.lnk', 3)))

  return apps
}

async function scanDir(
  rootDir: string,
  extension: string,
  maxDepth: number
): Promise<InstalledApp[]> {
  try {
    const results: InstalledApp[] = []
    await walkDir(rootDir, extension, maxDepth, 0, results)
    return results
  } catch {
    return []
  }
}

async function walkDir(
  dir: string,
  extension: string,
  maxDepth: number,
  currentDepth: number,
  results: InstalledApp[]
): Promise<void> {
  if (currentDepth > maxDepth) return

  let entries: Dirent[]
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue

    const fullPath = join(dir, entry.name)
    const currentExtension = extname(entry.name).toLowerCase()

    if (entry.isDirectory()) {
      if (currentExtension === extension) {
        results.push({
          name: basename(entry.name, currentExtension),
          path: fullPath,
          source: 'scan'
        })
        continue
      }

      if (currentDepth < maxDepth) {
        await walkDir(fullPath, extension, maxDepth, currentDepth + 1, results)
      }
      continue
    }

    if (entry.isFile() && currentExtension === extension) {
      results.push({
        name: basename(entry.name, currentExtension),
        path: fullPath,
        source: 'scan'
      })
    }
  }
}
