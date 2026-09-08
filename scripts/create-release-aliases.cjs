// Generates byte-identical, stable website download names after formal packaging completes.
const { createHash, randomUUID } = require('node:crypto')
const { createReadStream } = require('node:fs')
const fileSystem = require('node:fs/promises')
const path = require('node:path')

const platformSpecs = {
  mac: {
    label: 'macOS',
    aliasName: 'houdunyun-talkHero-mac-arm64.dmg',
    requiredNames(version) {
      return [
        `houdunyun-talkHero-${version}-mac-arm64.dmg`,
        `houdunyun-talkHero-${version}-arm64.zip`
      ]
    },
    sourceName(version) {
      return `houdunyun-talkHero-${version}-mac-arm64.dmg`
    }
  },
  win: {
    label: 'Windows',
    aliasName: 'houdunyun-talkHero.exe',
    requiredNames(version) {
      return [`houdunyun-talkHero-${version}.exe`]
    },
    sourceName(version) {
      return `houdunyun-talkHero-${version}.exe`
    }
  }
}

function fail(spec, message) {
  throw new Error(`[release alias: ${spec.label} -> ${spec.aliasName}] ${message}`)
}

async function requireNonEmptyRegularFile(filePath, spec) {
  let stats
  try {
    stats = await fileSystem.lstat(filePath)
  } catch (error) {
    fail(
      spec,
      `required artifact is missing: ${path.basename(filePath)} (${error.code ?? error.message})`
    )
  }
  if (!stats.isFile()) {
    fail(spec, `required artifact is not a regular file: ${path.basename(filePath)}`)
  }
  if (stats.size === 0) {
    fail(spec, `required artifact is empty: ${path.basename(filePath)}`)
  }
  return stats
}

function sha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(filePath)
    stream.on('error', reject)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

async function createReleaseAlias(platform, projectRoot) {
  const spec = platformSpecs[platform]
  if (!spec) {
    throw new Error(`unsupported platform "${platform}"; expected "mac" or "win"`)
  }

  const packagePath = path.join(projectRoot, 'package.json')
  let version
  try {
    const packageJson = JSON.parse(await fileSystem.readFile(packagePath, 'utf8'))
    version = packageJson.version
  } catch (error) {
    fail(spec, `cannot read package version: ${error.message}`)
  }
  if (
    typeof version !== 'string' ||
    version.length === 0 ||
    version.includes('/') ||
    version.includes('\\')
  ) {
    fail(spec, 'package.json contains an invalid version')
  }

  const distDir = path.join(projectRoot, 'dist')
  for (const requiredName of spec.requiredNames(version)) {
    await requireNonEmptyRegularFile(path.join(distDir, requiredName), spec)
  }

  const sourcePath = path.join(distDir, spec.sourceName(version))
  const aliasPath = path.join(distDir, spec.aliasName)
  const temporaryPath = path.join(distDir, `.${spec.aliasName}.${process.pid}.${randomUUID()}.tmp`)

  try {
    await fileSystem.copyFile(sourcePath, temporaryPath)
    const [sourceStats, temporaryStats, sourceHash, temporaryHash] = await Promise.all([
      requireNonEmptyRegularFile(sourcePath, spec),
      requireNonEmptyRegularFile(temporaryPath, spec),
      sha256(sourcePath),
      sha256(temporaryPath)
    ])
    if (sourceStats.size !== temporaryStats.size || sourceHash !== temporaryHash) {
      fail(spec, 'copied artifact failed size or SHA-256 verification')
    }
    await fileSystem.rename(temporaryPath, aliasPath)
  } catch (error) {
    let cleanupError
    try {
      await fileSystem.rm(temporaryPath, { force: true })
    } catch (error) {
      cleanupError = error
    }
    const primaryMessage = error.message.startsWith('[release alias:')
      ? error.message
      : `[release alias: ${spec.label} -> ${spec.aliasName}] ${error.message}`
    if (cleanupError) {
      throw new Error(
        `${primaryMessage}; failed to remove temporary file ${path.basename(temporaryPath)} ` +
          `(${cleanupError.code ?? cleanupError.message})`
      )
    }
    throw new Error(primaryMessage)
  }

  process.stdout.write(
    `[release alias] ${spec.label}: ${path.basename(sourcePath)} -> ${spec.aliasName}\n`
  )
}

function parseArguments(argv) {
  const platform = argv[0]
  const projectRootIndex = argv.indexOf('--project-root')
  if (projectRootIndex !== -1 && !argv[projectRootIndex + 1]) {
    throw new Error('--project-root requires a path')
  }
  return {
    platform,
    projectRoot:
      projectRootIndex === -1
        ? path.resolve(__dirname, '..')
        : path.resolve(argv[projectRootIndex + 1])
  }
}

if (require.main === module) {
  let options
  try {
    options = parseArguments(process.argv.slice(2))
  } catch (error) {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 1
  }
  if (options) {
    createReleaseAlias(options.platform, options.projectRoot).catch((error) => {
      process.stderr.write(`${error.message}\n`)
      process.exitCode = 1
    })
  }
}

module.exports = { createReleaseAlias }
