const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const viteArgs = process.argv.slice(2)

if (viteArgs.length === 0) {
  console.error('Missing electron-vite arguments.')
  process.exit(1)
}

const isWindows = process.platform === 'win32'
const electronViteBin = path.join(
  process.cwd(),
  'node_modules',
  '.bin',
  isWindows ? 'electron-vite.cmd' : 'electron-vite'
)

if (!fs.existsSync(electronViteBin)) {
  console.error(`electron-vite binary not found: ${electronViteBin}`)
  process.exit(1)
}

const command = isWindows ? 'pwsh' : electronViteBin
const args = isWindows
  ? [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      path.join(__dirname, 'with-utf8.ps1'),
      electronViteBin,
      ...viteArgs
    ]
  : viteArgs

const child = spawn(command, args, {
  stdio: 'inherit',
  shell: false,
  env: process.env
})

child.on('error', (error) => {
  console.error(error.message)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
