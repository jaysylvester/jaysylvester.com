import assert from 'node:assert/strict'
import childProcess from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { pathToFileURL } from 'node:url'

const lockedCommit = 'c6610ace80046f294ac85d358a75fd6f3880f6fd'
const newCommit = '1234567890abcdef1234567890abcdef12345678'
const citizenRepository = 'git+https://github.com/jaysylvester/citizen.git'

// Keep tests independent of Docker Desktop, the real .env, and the dev database.
const fixture = t => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'jaysylvester-dev-test-')))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  fs.mkdirSync(path.join(root, 'scripts'))
  fs.mkdirSync(path.join(root, 'bin'))

  for ( const script of ['dev', 'build', 'dev-dependencies', 'dev-dependencies.mjs'] ) {
    fs.copyFileSync(new URL(script, import.meta.url), path.join(root, 'scripts', script))
  }

  const manifest = {
    name: 'jaysylvester',
    version: '0.1.0',
    dependencies: { citizen: citizenRepository + '#2.0', stable: '*' },
    devDependencies: { tooling: '*' },
    engines: { node: '>=22.0.0' }
  }
  const lock = {
    name: manifest.name,
    version: manifest.version,
    lockfileVersion: 3,
    packages: {
      '': structuredClone(manifest),
      'node_modules/citizen': { version: '2.0.0', resolved: citizenRepository + '#' + lockedCommit },
      'node_modules/stable': { version: '1.0.0' },
      'node_modules/tooling': { version: '1.0.0', dev: true }
    }
  }

  const write = (name, value) => fs.writeFileSync(path.join(root, name), JSON.stringify(value))
  write('package.json', manifest)
  write('package-lock.json', lock)
  fs.writeFileSync(path.join(root, '.env'), '# Test fixture only\n')

  fs.writeFileSync(path.join(root, 'bin', 'docker'), `#!/usr/bin/env node
const fs = require('node:fs')
const args = process.argv.slice(2)
fs.appendFileSync(process.env.TEST_COMMAND_LOG, JSON.stringify(args) + '\\n')
if (args[0] === process.env.TEST_FAIL_COMMAND) process.exit(42)
if (args[0] === 'build' && process.env.TEST_FAIL_IMAGE && args.some(argument => argument.includes('-' + process.env.TEST_FAIL_IMAGE + ':'))) process.exit(42)
if (args[0] === 'run') {
  const result = require('node:child_process').spawnSync(
    process.execPath, args.slice(args.indexOf('node') + 1),
    { cwd: process.env.TEST_PROJECT, stdio: 'inherit' }
  )
  if (result.error) throw result.error
  process.exit(result.status ?? 1)
}
`, { mode: 0o755 })

  fs.writeFileSync(path.join(root, 'bin', 'npm'), `#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')
const args = process.argv.slice(2)
const root = process.env.TEST_PROJECT
fs.appendFileSync(process.env.TEST_COMMAND_LOG, JSON.stringify(['npm', ...args]) + '\\n')
if (process.env.TEST_FAIL_COMMAND === 'npm') process.exit(42)
if (process.env.TEST_REAL_NPM) {
  const result = require('node:child_process').spawnSync('npm', args, {
    cwd: root, stdio: 'inherit', env: { ...process.env, PATH: process.env.TEST_SYSTEM_PATH }
  })
  if (result.error) throw result.error
  process.exit(result.status ?? 1)
}
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const lockPath = path.join(root, 'package-lock.json')
const lock = fs.existsSync(lockPath)
  ? JSON.parse(fs.readFileSync(lockPath, 'utf8'))
  : { lockfileVersion: 3, packages: {} }
lock.packages[''] = pkg
lock.name = pkg.name
lock.version = pkg.version
if (pkg.dependencies?.citizen) {
  lock.packages['node_modules/citizen'] = {
    version: '2.0.0',
    resolved: 'git+ssh://git@github.com/jaysylvester/citizen.git#${newCommit}'
  }
}
fs.writeFileSync(lockPath, JSON.stringify(lock))
`, { mode: 0o755 })

  for ( const script of ['dev-cert', 'dev-db-initialize'] ) {
    fs.writeFileSync(path.join(root, 'scripts', script), `#!/usr/bin/env node
require('node:fs').appendFileSync(process.env.TEST_COMMAND_LOG, '"${script}"\\n')
`, { mode: 0o755 })
  }

  const environment = {
    ...process.env,
    PATH: path.join(root, 'bin') + path.delimiter + process.env.PATH,
    TEST_PROJECT: root,
    TEST_COMMAND_LOG: path.join(root, 'commands.jsonl'),
    TEST_FAIL_COMMAND: '',
    TEST_SYSTEM_PATH: process.env.PATH
  }
  const run = (args = ['start', '-d'], extraEnvironment = {}) => childProcess.spawnSync(
    'sh', [path.join(root, 'scripts', 'dev'), ...args],
    { cwd: os.tmpdir(), env: { ...environment, ...extraEnvironment }, encoding: 'utf8' }
  )
  const commands = () => fs.readFileSync(environment.TEST_COMMAND_LOG, 'utf8')
    .trim().split('\n').map(line => JSON.parse(line))
  const readLock = () => JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'))

  return { root, manifest, lock, write, run, commands, readLock }
}

const composeAction = (commands, action) => commands.find(command =>
  Array.isArray(command) && command[0] === 'compose' && command.includes(action)
)

test('unchanged declarations keep the lockfile and start with a cached build', t => {
  const f = fixture(t)
  const before = fs.readFileSync(path.join(f.root, 'package-lock.json'), 'utf8')
  const result = f.run()

  assert.equal(result.status, 0, result.stderr)
  assert.equal(fs.readFileSync(path.join(f.root, 'package-lock.json'), 'utf8'), before)
  assert.ok(!f.commands().some(command => command[0] === 'npm'))
  assert.deepEqual(composeAction(f.commands(), 'up').slice(-3), ['up', '--no-build', '-d'])
})

test('an explicit refresh resolves an unchanged branch before startup and consumes only its own flags', t => {
  const f = fixture(t)
  const result = f.run(['start', '-d', '--update', 'citizen', '--no-deps', 'app'])
  assert.equal(result.status, 0, result.stderr)
  const commands = f.commands()
  const update = commands.find(command => command[0] === 'npm')
  assert.deepEqual(update, ['npm', 'update', 'citizen', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'])
  assert.deepEqual(composeAction(commands, 'up').slice(-5), ['up', '--no-build', '-d', '--no-deps', 'app'])
  assert.equal(f.readLock().packages['node_modules/citizen'].resolved, citizenRepository + '#' + newCommit)
  assert.equal(f.readLock().packages['node_modules/stable'].version, '1.0.0')
  assert.ok(commands.indexOf(update) < commands.indexOf(composeAction(commands, 'up')))
  assert.match(result.stdout, new RegExp(lockedCommit + ' -> ' + newCommit))
})

test('refresh accepts multiple declared packages and includes changed declarations without duplication', t => {
  const f = fixture(t)
  f.manifest.devDependencies.tooling = '^2.0.0'
  f.manifest.dependencies['@scope/example'] = '^1.0.0'
  f.write('package.json', f.manifest)
  const result = f.run(['start', '--update', 'tooling', '--update', '@scope/example', '--update', 'tooling', '-d'])
  assert.equal(result.status, 0, result.stderr)
  const update = f.commands().find(command => command[0] === 'npm')
  assert.deepEqual(update.slice(0, -4), ['npm', 'update', '@scope/example', 'tooling'])
  assert.equal(f.readLock().packages['node_modules/stable'].version, '1.0.0')
})

test('build-only refresh works without runtime configuration', t => {
  const f = fixture(t)
  fs.unlinkSync(path.join(f.root, '.env'))
  const result = f.run(['build', '--update', 'citizen'])
  assert.equal(result.status, 0, result.stderr)
  assert.ok(f.commands().some(command => command[0] === 'npm' && command.includes('citizen')))
  assert.ok(!f.commands().some(command => command[0] === 'compose'))
})

for ( const command of ['start', 'build'] ) {
  test(command + ' rejects a refresh flag without a package name before running Docker', t => {
    const f = fixture(t)
    const result = f.run([command, '--update'])
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /requires a dependency name/)
    assert.ok(!fs.existsSync(path.join(f.root, 'commands.jsonl')))
  })
}

test('refresh rejects undeclared dependencies without changing the lockfile or starting services', t => {
  const f = fixture(t)
  const before = fs.readFileSync(path.join(f.root, 'package-lock.json'), 'utf8')
  const result = f.run(['start', '--update', 'typo', '-d'])
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /undeclared dependency: typo/)
  assert.equal(fs.readFileSync(path.join(f.root, 'package-lock.json'), 'utf8'), before)
  assert.ok(!f.commands().some(command => command[0] === 'npm'))
  assert.ok(!composeAction(f.commands(), 'up'))
})

test('locked production builds reject refresh before running Docker or changing packages', t => {
  const f = fixture(t)
  const before = fs.readFileSync(path.join(f.root, 'package-lock.json'), 'utf8')
  const result = f.run(['build', 'production', '--locked', '--update', 'citizen'])
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /--locked cannot be combined with --update/)
  assert.equal(fs.readFileSync(path.join(f.root, 'package-lock.json'), 'utf8'), before)
  assert.ok(!fs.existsSync(path.join(f.root, 'commands.jsonl')))
})

test('a failed explicit refresh stops before building app images or replacing services', t => {
  const f = fixture(t)
  const before = fs.readFileSync(path.join(f.root, 'package-lock.json'), 'utf8')
  const result = f.run(['start', '--update', 'citizen', '-d'], { TEST_FAIL_COMMAND: 'npm' })
  assert.notEqual(result.status, 0)
  assert.equal(fs.readFileSync(path.join(f.root, 'package-lock.json'), 'utf8'), before)
  assert.ok(!f.commands().some(command => command.some?.(argument => argument.includes('-app:development'))))
  assert.ok(!composeAction(f.commands(), 'up'))
  assert.ok(!f.commands().includes('dev-db-initialize'))
})

test('real npm refreshes an advancing branch with unchanged manifest and package version', t => {
  const f = fixture(t)
  const repository = path.join(f.root, 'citizen-repository')
  fs.mkdirSync(repository)
  const environment = {
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: '/dev/null',
    npm_config_cache: path.join(f.root, 'npm-cache'),
    npm_config_offline: 'true'
  }
  const command = (program, args, cwd) => {
    const result = childProcess.spawnSync(program, args, {
      cwd, env: { ...process.env, ...environment }, encoding: 'utf8'
    })
    assert.equal(result.status, 0, result.stderr)
    return result.stdout.trim()
  }
  const git = args => command('git', args, repository)
  git(['init', '--template=', '--initial-branch=2.0'])
  fs.writeFileSync(path.join(repository, 'package.json'), JSON.stringify({ name: 'citizen', version: '2.0.0' }))
  const commit = marker => {
    fs.writeFileSync(path.join(repository, 'marker.txt'), marker)
    git(['add', '.'])
    git(['-c', 'user.name=Dev script test', '-c', 'user.email=dev-test@example.invalid',
      '-c', 'commit.gpgsign=false', 'commit', '-m', marker])
    return git(['rev-parse', 'HEAD'])
  }
  const firstCommit = commit('first')
  const spec = 'git+' + pathToFileURL(repository).href + '#2.0'
  f.manifest.dependencies = { citizen: spec }
  delete f.manifest.devDependencies
  f.write('package.json', f.manifest)
  fs.unlinkSync(path.join(f.root, 'package-lock.json'))
  command('npm', ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'], f.root)
  const before = fs.readFileSync(path.join(f.root, 'package-lock.json'), 'utf8')
  const nextCommit = commit('second')

  assert.equal(f.run(['start', '-d'], environment).status, 0)
  assert.equal(fs.readFileSync(path.join(f.root, 'package-lock.json'), 'utf8'), before)
  assert.ok(f.readLock().packages['node_modules/citizen'].resolved.endsWith('#' + firstCommit))

  const result = f.run(['start', '--update', 'citizen', '-d'], { ...environment, TEST_REAL_NPM: 'npm' })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(f.readLock().packages['node_modules/citizen'].version, '2.0.0')
  assert.ok(f.readLock().packages['node_modules/citizen'].resolved.endsWith('#' + nextCommit))
  assert.equal(f.readLock().packages[''].dependencies.citizen, spec)
  assert.ok(!fs.existsSync(path.join(f.root, 'node_modules')))

  const unchanged = f.run(['start', '--update', 'citizen', '-d'], { ...environment, TEST_REAL_NPM: 'npm' })
  assert.equal(unchanged.status, 0, unchanged.stderr)
  assert.match(unchanged.stdout, new RegExp(nextCommit + ' \\(unchanged\\)'))
})

test('a changed Git branch is refreshed without updating unrelated dependencies', t => {
  const f = fixture(t)
  f.lock.packages[''].dependencies.citizen = citizenRepository + '#' + lockedCommit
  f.write('package-lock.json', f.lock)
  const result = f.run()

  assert.equal(result.status, 0, result.stderr)
  const commands = f.commands()
  const install = commands.find(command => command[0] === 'npm')
  const container = commands.find(command => command[0] === 'run')
  assert.ok(commands.some(command => command[0] === 'build' && command.includes('dependency-tools')))
  assert.deepEqual(install.slice(install.indexOf('npm') + 1), [
    'update', 'citizen', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'
  ])
  assert.ok(container.includes('NPM_CONFIG_CACHE=/tmp/npm-cache'))
  assert.ok(container.includes(process.getuid() + ':' + process.getgid()))
  assert.ok(container.includes(f.root + ':/site'))
  assert.equal(f.readLock().packages['node_modules/citizen'].resolved, citizenRepository + '#' + newCommit)
  assert.equal(f.readLock().packages['node_modules/stable'].version, '1.0.0')
  assert.ok(commands.indexOf(install) < commands.indexOf(composeAction(commands, 'up')))

  const firstRunCount = commands.length
  assert.equal(f.run().status, 0)
  assert.ok(!f.commands().slice(firstRunCount).some(command => command[0] === 'npm'))
})

test('added and changed registry declarations are refreshed by name', t => {
  const f = fixture(t)
  f.manifest.dependencies.added = '^3.0.0'
  f.manifest.devDependencies.tooling = '^2.0.0'
  f.write('package.json', f.manifest)

  const result = f.run()
  assert.equal(result.status, 0, result.stderr)
  const install = f.commands().find(command => command[0] === 'npm')
  assert.deepEqual(install.slice(install.indexOf('npm') + 1, -4), ['update', 'added', 'tooling'])
})

test('removing a dependency synchronizes the lockfile without updating other names', t => {
  const f = fixture(t)
  delete f.manifest.devDependencies.tooling
  f.write('package.json', f.manifest)

  const result = f.run()
  assert.equal(result.status, 0, result.stderr)
  const install = f.commands().find(command => command[0] === 'npm')
  assert.equal(install[install.indexOf('npm') + 1], 'install')
  assert.deepEqual(f.readLock().packages[''].devDependencies, {})
})

test('a missing lockfile is generated before startup', t => {
  const f = fixture(t)
  fs.unlinkSync(path.join(f.root, 'package-lock.json'))

  const result = f.run()
  assert.equal(result.status, 0, result.stderr)
  const install = f.commands().find(command => command[0] === 'npm')
  assert.equal(install[install.indexOf('npm') + 1], 'install')
  assert.equal(f.readLock().packages[''].dependencies.citizen, citizenRepository + '#2.0')
})

test('metadata-only edits synchronize the lockfile and restart also builds', t => {
  const f = fixture(t)
  f.manifest.version = '0.2.0'
  f.write('package.json', f.manifest)

  const result = f.run(['restart'])
  assert.equal(result.status, 0, result.stderr)
  assert.ok(f.commands().some(command => command[0] === 'build' && command.includes('--tag') && command.some(argument => argument.endsWith('-app:development'))))
  assert.deepEqual(composeAction(f.commands(), 'up').slice(-8),
    ['up', '--detach', '--no-build', '--no-deps', '--force-recreate', 'app', 'proxy', 'assets'])
  assert.ok(!composeAction(f.commands(), 'up').includes('db'))
  assert.equal(f.readLock().version, '0.2.0')
})

for ( const command of ['build', 'run', 'npm'] ) {
  test('dependency ' + command + ' failure prevents app startup', t => {
    const f = fixture(t)
    f.manifest.dependencies.citizen = citizenRepository + '#another-branch'
    f.write('package.json', f.manifest)

    const result = f.run(['start', '-d'], { TEST_FAIL_COMMAND: command })
    assert.notEqual(result.status, 0)
    assert.ok(!composeAction(f.commands(), 'up'))
    assert.ok(!f.commands().includes('dev-cert'))
    assert.ok(!f.commands().includes('dev-db-initialize'))
    if ( command === 'npm' ) assert.match(result.stderr, /dependency preparation failed/)
  })
}

test('real npm resolves a changed branch to its commit using an offline local Git repository', t => {
  const f = fixture(t)
  const repository = path.join(f.root, 'citizen-repository')
  fs.mkdirSync(repository)
  const environment = {
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: '/dev/null',
    npm_config_cache: path.join(f.root, 'npm-cache'),
    npm_config_offline: 'true'
  }
  const command = (program, args, cwd) => {
    const result = childProcess.spawnSync(program, args, {
      cwd, env: { ...process.env, ...environment }, encoding: 'utf8'
    })
    assert.equal(result.status, 0, result.stderr)
    return result.stdout.trim()
  }
  const git = args => command('git', args, repository)
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

  git(['init', '--template=', '--initial-branch=main'])
  const commit = version => {
    fs.writeFileSync(path.join(repository, 'package.json'), JSON.stringify({ name: 'citizen', version }))
    git(['add', 'package.json'])
    git(['-c', 'user.name=Dev script test', '-c', 'user.email=dev-test@example.invalid',
      '-c', 'commit.gpgsign=false', 'commit', '-m', version])
    return git(['rev-parse', 'HEAD'])
  }
  const firstCommit = commit('1.0.0')
  git(['checkout', '-b', 'next'])
  const nextCommit = commit('2.0.0')
  const spec = 'git+' + pathToFileURL(repository).href
  f.manifest.dependencies = { citizen: spec + '#' + firstCommit }
  delete f.manifest.devDependencies
  f.write('package.json', f.manifest)
  fs.unlinkSync(path.join(f.root, 'package-lock.json'))
  command(npm, ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'], f.root)

  f.manifest.dependencies.citizen = spec + '#next'
  f.write('package.json', f.manifest)
  const result = f.run(['start', '-d'], { ...environment, TEST_REAL_NPM: npm })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(f.readLock().packages['node_modules/citizen'].version, '2.0.0')
  assert.ok(f.readLock().packages['node_modules/citizen'].resolved.endsWith('#' + nextCommit))
  assert.equal(f.readLock().packages[''].dependencies.citizen, spec + '#next')
  assert.ok(!fs.existsSync(path.join(f.root, 'node_modules')))
})


test('a database-only restart is explicit and does not prepare application dependencies', t => {
  const f = fixture(t)
  const result = f.run(['restart', 'db'])
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(composeAction(f.commands(), 'restart').slice(-2), ['restart', 'db'])
  assert.ok(!composeAction(f.commands(), 'build'))
  assert.ok(!composeAction(f.commands(), 'up'))
  assert.ok(!f.commands().some(command => command[0] === 'npm'))
})

test('restarting assets builds the shared image and recreates only the requested service', t => {
  const f = fixture(t)
  const result = f.run(['restart', 'assets'])
  assert.equal(result.status, 0, result.stderr)
  assert.ok(f.commands().some(command => command[0] === 'build' && command.includes('--tag') && command.some(argument => argument.endsWith('-app:development'))))
  assert.deepEqual(composeAction(f.commands(), 'up').slice(-6),
    ['up', '--detach', '--no-build', '--no-deps', '--force-recreate', 'assets'])
})

test('restart rejects options that could select the full stack implicitly', t => {
  const f = fixture(t)
  const result = f.run(['restart', '-d'])
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Unknown development service/)
  assert.ok(!fs.existsSync(path.join(f.root, 'commands.jsonl')))
})

test('a mixed restart restarts db in place and recreates only non-data services', t => {
  const f = fixture(t)
  const result = f.run(['restart', 'app', 'db'])
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(composeAction(f.commands(), 'restart').slice(-2), ['restart', 'db'])
  assert.deepEqual(composeAction(f.commands(), 'up').slice(-6),
    ['up', '--detach', '--no-build', '--no-deps', '--force-recreate', 'app'])
})

test('start consumes a redundant --build and forwards other Compose arguments', t => {
  const f = fixture(t)
  const result = f.run(['start', '--build', '-d', '--no-deps', 'app'])
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(composeAction(f.commands(), 'up').slice(-5), ['up', '--no-build', '-d', '--no-deps', 'app'])
})

test('build works without runtime configuration and selects production targets', t => {
  const f = fixture(t)
  fs.unlinkSync(path.join(f.root, '.env'))
  const result = f.run(['build', 'production'])
  assert.equal(result.status, 0, result.stderr)
  assert.ok(f.commands().some(command => command[0] === 'build' && command.includes('production')))
  assert.ok(f.commands().some(command => command.includes('NGINX_CONFIG=production.conf')))
  assert.ok(!f.commands().some(command => command[0] === 'compose'))
})

for ( const image of ['app', 'proxy'] ) {
  test(image + ' build failure prevents service replacement', t => {
    const f = fixture(t)
    const result = f.run(['restart'], { TEST_FAIL_IMAGE: image })
    assert.notEqual(result.status, 0)
    assert.ok(!composeAction(f.commands(), 'up'))
    assert.ok(!composeAction(f.commands(), 'restart'))
  })
}

for ( const drift of ['Git declaration', 'missing lockfile'] ) {
  test('locked build refuses ' + drift + ' without writing or resolving packages', t => {
    const f = fixture(t)
    if ( drift === 'missing lockfile' ) {
      fs.unlinkSync(path.join(f.root, 'package-lock.json'))
    } else {
      f.manifest.dependencies.citizen = citizenRepository + '#different'
      f.write('package.json', f.manifest)
    }
    const before = fs.existsSync(path.join(f.root, 'package-lock.json'))
      ? fs.readFileSync(path.join(f.root, 'package-lock.json'), 'utf8') : null
    const result = f.run(['build', 'production', '--locked'])
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /out of sync/)
    assert.ok(!f.commands().some(command => command[0] === 'npm'))
    assert.ok(!f.commands().some(command => command.some(argument => argument.includes('-app:production'))))
    if ( before === null ) assert.ok(!fs.existsSync(path.join(f.root, 'package-lock.json')))
    else assert.equal(fs.readFileSync(path.join(f.root, 'package-lock.json'), 'utf8'), before)
    assert.ok(f.commands().some(command => command.includes(f.root + ':/site:ro')))
  })
}

test('lockfile-only changes are left intact and reach the subsequent build', t => {
  const f = fixture(t)
  f.lock.packages['node_modules/stable'].version = '1.5.0'
  f.write('package-lock.json', f.lock)
  const before = fs.readFileSync(path.join(f.root, 'package-lock.json'), 'utf8')
  const result = f.run(['build'])
  assert.equal(result.status, 0, result.stderr)
  assert.equal(fs.readFileSync(path.join(f.root, 'package-lock.json'), 'utf8'), before)
  assert.ok(!f.commands().some(command => command[0] === 'npm'))
  assert.ok(f.commands().some(command => command[0] === 'build' && command.includes('development')))
})

test('destroy rejects volume deletion flags before calling Docker', t => {
  const f = fixture(t)
  const result = f.run(['destroy', '--volumes'])
  assert.notEqual(result.status, 0)
  assert.ok(!fs.existsSync(path.join(f.root, 'commands.jsonl')))
})
