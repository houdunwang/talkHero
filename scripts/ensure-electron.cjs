const { downloadArtifact } = require('@electron/get')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

function getPlatform() {
  return process.env.npm_config_platform || process.platform
}

function getArch() {
  return process.env.npm_config_arch || process.arch
}

function getPlatformPath(platform) {
  switch (platform) {
    case 'darwin':
      return 'Electron.app/Contents/MacOS/Electron'
    case 'freebsd':
    case 'openbsd':
    case 'linux':
      return 'electron'
    case 'win32':
      return 'electron.exe'
    default:
      throw new Error(`Electron builds are not available on platform: ${platform}`)
  }
}

function isInstalled(electronPkgDir, electronExe, electronVersion, platformPath) {
  try {
    const versionFile = fs
      .readFileSync(path.join(electronPkgDir, 'dist', 'version'), 'utf-8')
      .trim()
    const pathFile = fs.readFileSync(path.join(electronPkgDir, 'path.txt'), 'utf-8').trim()

    return (
      versionFile.replace(/^v/, '') === electronVersion &&
      pathFile === platformPath &&
      fs.existsSync(electronExe)
    )
  } catch {
    return false
  }
}

async function main() {
  const platform = getPlatform()
  const arch = getArch()
  const platformPath = getPlatformPath(platform)
  const electronPkgDir = path.dirname(require.resolve('electron/package.json'))
  const distDir = path.join(electronPkgDir, 'dist')
  const electronExe = path.join(distDir, platformPath)
  const electronVersion = require('electron/package.json').version

  if (isInstalled(electronPkgDir, electronExe, electronVersion, platformPath)) {
    console.log('[ensure-electron] Electron binary already exists, skipping.')
    return
  }

  console.log(
    `[ensure-electron] Downloading Electron v${electronVersion} for ${platform}-${arch}...`
  )

  const zipPath = await downloadArtifact({
    version: electronVersion,
    artifactName: 'electron',
    platform,
    arch
  })

  console.log('[ensure-electron] Extracting...')

  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true })
  }
  fs.mkdirSync(distDir, { recursive: true })

  if (platform === 'win32') {
    const psZip = zipPath.replace(/'/g, "''")
    const psDist = distDir.replace(/'/g, "''")
    const psScript = `Import-Module Microsoft.PowerShell.Archive -ErrorAction SilentlyContinue; Expand-Archive -LiteralPath '${psZip}' -DestinationPath '${psDist}' -Force`
    execSync(`pwsh.exe -NoProfile -Command "${psScript}"`, { stdio: 'inherit' })
  } else {
    execSync(`unzip -o "${zipPath}" -d "${distDir}"`, { stdio: 'inherit' })
  }

  fs.writeFileSync(path.join(electronPkgDir, 'path.txt'), platformPath, 'utf-8')

  if (!fs.existsSync(path.join(distDir, 'version'))) {
    fs.writeFileSync(path.join(distDir, 'version'), `v${electronVersion}`, 'utf-8')
  }

  if (fs.existsSync(electronExe)) {
    console.log(`[ensure-electron] Electron v${electronVersion} installed successfully.`)
  } else {
    throw new Error(`Electron binary not found after extraction: ${electronExe}`)
  }
}

main().catch((err) => {
  console.error('[ensure-electron] Failed:', err.message)
  process.exit(1)
})
