const assert = require('node:assert/strict')
const { execFileSync, spawnSync } = require('node:child_process')
const {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync
} = require('node:fs')
const fileSystem = require('node:fs/promises')
const { tmpdir } = require('node:os')
const path = require('node:path')
const test = require('node:test')
const { createReleaseAlias } = require('./create-release-aliases.cjs')

const projectRoot = path.resolve(__dirname, '..')
const aliasScript = path.join(__dirname, 'create-release-aliases.cjs')

function createProject(version = '2.1.27') {
  const root = mkdtempSync(path.join(tmpdir(), 'release-aliases-'))
  mkdirSync(path.join(root, 'dist'))
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version }))
  return root
}

function runAlias(platform, root) {
  execFileSync(process.execPath, [aliasScript, platform, '--project-root', root], {
    encoding: 'utf8'
  })
}

test('macOS creates only the non-versioned DMG alias and preserves source artifacts', () => {
  const root = createProject()
  const dist = path.join(root, 'dist')
  const dmgSource = path.join(dist, 'houdunyun-talkHero-2.1.27-mac-arm64.dmg')
  const zipSource = path.join(dist, 'houdunyun-talkHero-2.1.27-arm64.zip')
  writeFileSync(dmgSource, Buffer.from([0, 1, 2, 3, 255]))
  writeFileSync(zipSource, 'versioned zip')

  runAlias('mac', root)

  assert.deepEqual(
    readFileSync(path.join(dist, 'houdunyun-talkHero-mac-arm64.dmg')),
    readFileSync(dmgSource)
  )
  assert.equal(readFileSync(zipSource, 'utf8'), 'versioned zip')
  assert.equal(existsSync(path.join(dist, 'houdunyun-talkHero-arm64.zip')), false)
  assert.equal(existsSync(path.join(dist, 'houdunyun-talkHero.exe')), false)
})

test('Windows creates only the non-versioned NSIS alias and preserves the source', () => {
  const root = createProject()
  const dist = path.join(root, 'dist')
  const source = path.join(dist, 'houdunyun-talkHero-2.1.27.exe')
  writeFileSync(source, Buffer.from('new windows installer'))

  runAlias('win', root)

  assert.deepEqual(readFileSync(path.join(dist, 'houdunyun-talkHero.exe')), readFileSync(source))
  assert.equal(existsSync(path.join(dist, 'houdunyun-talkHero-mac-arm64.dmg')), false)
})

for (const fixture of [
  { name: 'missing' },
  {
    name: 'empty',
    content: ''
  }
]) {
  test(`macOS ${fixture.name} source fails clearly without producing an alias`, () => {
    const root = createProject()
    if (fixture.content !== undefined) {
      writeFileSync(
        path.join(root, 'dist', 'houdunyun-talkHero-2.1.27-mac-arm64.dmg'),
        fixture.content
      )
    }

    const result = spawnSync(process.execPath, [aliasScript, 'mac', '--project-root', root], {
      encoding: 'utf8'
    })

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /macOS/)
    assert.match(result.stderr, /houdunyun-talkHero-mac-arm64\.dmg/)
    assert.equal(existsSync(path.join(root, 'dist', 'houdunyun-talkHero-mac-arm64.dmg')), false)
  })
}

test('macOS requires the versioned ZIP but never creates a ZIP alias', () => {
  const root = createProject()
  const dist = path.join(root, 'dist')
  writeFileSync(path.join(dist, 'houdunyun-talkHero-2.1.27-mac-arm64.dmg'), 'signed dmg')

  const result = spawnSync(process.execPath, [aliasScript, 'mac', '--project-root', root], {
    encoding: 'utf8'
  })

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /macOS/)
  assert.match(result.stderr, /houdunyun-talkHero-mac-arm64\.dmg/)
  assert.match(result.stderr, /houdunyun-talkHero-2\.1\.27-arm64\.zip/)
  assert.equal(existsSync(path.join(dist, 'houdunyun-talkHero-mac-arm64.dmg')), false)
  assert.equal(existsSync(path.join(dist, 'houdunyun-talkHero-arm64.zip')), false)
})

test('a repeated build replaces an old alias with the complete current artifact', () => {
  const root = createProject()
  const dist = path.join(root, 'dist')
  const source = path.join(dist, 'houdunyun-talkHero-2.1.27.exe')
  const alias = path.join(dist, 'houdunyun-talkHero.exe')
  writeFileSync(source, Buffer.alloc(256 * 1024, 0xa5))
  writeFileSync(alias, 'old release')

  runAlias('win', root)

  assert.deepEqual(readFileSync(alias), readFileSync(source))
})

test('a rename failure removes the completed temporary copy', () => {
  const root = createProject()
  const dist = path.join(root, 'dist')
  writeFileSync(path.join(dist, 'houdunyun-talkHero-2.1.27.exe'), 'windows installer')
  mkdirSync(path.join(dist, 'houdunyun-talkHero.exe'))

  const result = spawnSync(process.execPath, [aliasScript, 'win', '--project-root', root], {
    encoding: 'utf8'
  })

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Windows/)
  assert.deepEqual(
    readdirSync(dist).filter((name) => name.startsWith('.houdunyun-talkHero.exe.')),
    []
  )
})

test('a temporary cleanup failure is included in the reported build error', async (t) => {
  const root = createProject()
  const dist = path.join(root, 'dist')
  writeFileSync(path.join(dist, 'houdunyun-talkHero-2.1.27.exe'), 'windows installer')
  t.mock.method(fileSystem, 'copyFile', async () => {
    const error = new Error('simulated copy failure')
    error.code = 'EIO'
    throw error
  })
  t.mock.method(fileSystem, 'rm', async () => {
    const error = new Error('simulated cleanup failure')
    error.code = 'EPERM'
    throw error
  })

  await assert.rejects(
    createReleaseAlias('win', root),
    /Windows -> houdunyun-talkHero\.exe.*simulated copy failure.*failed to remove temporary file.*EPERM/
  )
})

test('formal build entry points invoke aliases after electron-builder and quick mac build does not', () => {
  const macBuild = readFileSync(path.join(projectRoot, 'scripts', 'build-mac-web.sh'), 'utf8')
  const winBuild = readFileSync(path.join(projectRoot, 'scripts', 'build-win.cjs'), 'utf8')
  const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))

  assert.match(macBuild, /electron-builder --mac --arm64[\s\S]*create-release-aliases\.cjs" mac/)
  assert.match(winBuild, /electron-builder --win --x64[\s\S]*create-release-aliases\.cjs win/)
  assert.doesNotMatch(packageJson.scripts['build:web:mac:quick'], /create-release-aliases/)
})
