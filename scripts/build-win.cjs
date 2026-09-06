const { execSync } = require('child_process')

process.env.ELECTRON_BUILDER_BINARIES_MIRROR =
  'https://npmmirror.com/mirrors/electron-builder-binaries/'

execSync(
  'pnpm run clean && pnpm run build && electron-builder --win --x64 && node ./scripts/create-release-aliases.cjs win',
  {
    stdio: 'inherit',
    env: { ...process.env }
  }
)
