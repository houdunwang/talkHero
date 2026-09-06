import { app, nativeImage } from 'electron'
import { existsSync } from 'node:fs'
import path from 'node:path'

const TRAY_ICON_NAME = 'macTrayTemplate.png'
const WINDOWS_TRAY_ICON_NAME = 'icon.png'

function getTrayIconPath() {
  const name = process.platform === 'win32' ? WINDOWS_TRAY_ICON_NAME : TRAY_ICON_NAME
  const iconPaths = app.isPackaged
    ? [path.join(process.resourcesPath, name), path.join(process.resourcesPath, TRAY_ICON_NAME)]
    : [path.join(process.cwd(), 'build', name), path.join(process.cwd(), 'build', TRAY_ICON_NAME)]

  const iconPath = iconPaths.find((candidate) => existsSync(candidate))

  if (iconPath) {
    return iconPath
  }

  return iconPaths[0]
}

export function createTrayIcon() {
  const iconPath = getTrayIconPath()
  const icon = nativeImage.createFromPath(iconPath)

  // macOS will automatically pick up trayTemplate@2x.png when it sits
  if (process.platform === 'darwin' && !icon.isEmpty()) {
    icon.setTemplateImage(true)
  }

  if (icon.isEmpty()) {
    console.warn(`[tray] Tray icon not found or empty: ${iconPath}`)
  }

  return icon
}
