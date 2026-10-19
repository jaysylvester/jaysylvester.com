import assert from 'node:assert/strict'
import childProcess from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

const fixture = t => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'citizen-prod-test-')))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  fs.mkdirSync(path.join(root, 'scripts'))
  fs.mkdirSync(path.join(root, 'bin'))
  for ( const name of ['prod', 'deploy-production', 'build', 'dev-dependencies', 'dev-dependencies.mjs'] ) {
    let source = fs.readFileSync(new URL(name, import.meta.url), 'utf8')
    if ( name === 'deploy-production' ) source = source.replace('site=/var/www/jaysylvester.com', 'site=' + root)
    fs.writeFileSync(path.join(root, 'scripts', name), source, { mode: 0o755 })
  }
  const manifest = { name: 'fixture', version: '1.0.0', dependencies: { example: 'git+https://example.invalid/repository#main' } }
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(manifest))
  fs.writeFileSync(path.join(root, 'package-lock.json'), JSON.stringify({ lockfileVersion: 3, packages: { '': manifest } }))
  fs.writeFileSync(path.join(root, '.env'), '# Fixture only\n')
  const oldApp = 'sha256:' + 'a'.repeat(64)
  const oldProxy = 'sha256:' + 'b'.repeat(64)
  const stateFile = path.join(root, 'state.json')
  fs.writeFileSync(stateFile, JSON.stringify({
    tags: { 'jaysylvester-app:production': oldApp, 'jaysylvester-proxy:production': oldProxy },
    running: { app: oldApp, proxy: oldProxy }
  }))
  const executable = (name, source) => fs.writeFileSync(path.join(root, 'bin', name), '#!/usr/bin/env node\n' + source, { mode: 0o755 })
  const logging = `const fs = require('node:fs')
const args = process.argv.slice(2)
const record = tool => fs.appendFileSync(process.env.TEST_LOG, JSON.stringify({tool, args, sudo: process.env.TEST_SUDO === 'true'}) + '\\n')
`
  executable('sudo', logging + `record('sudo')
if (args[0] === '-v') process.exit(0)
const result = require('node:child_process').spawnSync(args[0], args.slice(1), {stdio: 'inherit', env: {...process.env, TEST_SUDO: 'true'}})
process.exit(result.status ?? 1)
`)
  executable('id', 'process.stdout.write(process.argv[2] === \'-u\' ? \'501\' : \'20\')')
  executable('git', logging + `record('git')
if (args[0] === 'branch') process.stdout.write(process.env.TEST_BRANCH || 'main')
if (args[0] === 'status') process.stdout.write(process.env.TEST_DIRTY || '')
if (args[0] === 'rev-parse') process.stdout.write('fixture-revision')
if (args[0] === 'pull' && process.env.TEST_PULL_FAIL) process.exit(42)
`)
  executable('npm', logging + 'record(\'npm\'); process.exit(97)')
  executable('docker', logging + `record('docker')
const state = JSON.parse(fs.readFileSync(process.env.TEST_STATE))
const save = () => fs.writeFileSync(process.env.TEST_STATE, JSON.stringify(state))
if (args[0] === 'compose') {
  if (args.includes('config') && args.includes('--environment')) {
    process.stdout.write('DB_USER=' + (process.env.TEST_DB_USER ?? 'jaysylvester') + '\\nDB_PASSWORD=fixture-only\\n' + (process.env.TEST_SECRET_MISSING ? '' : 'MAIL_AUTH_PASS=fixture-only\\n'))
  } else if (args.includes('config') && !args.includes('--quiet')) {
    process.stdout.write('volumes:\\n  app-logs:\\n    name: fixture-logs\\n  postgres-data:\\n    name: fixture-db\\nnetworks:\\n  default:\\n    name: fixture-network\\nsecrets:\\n  db-password:\\n    name: fixture_db-password\\n  mail-auth-pass:\\n    name: fixture_mail-auth-pass\\n')
  }
  if (args.includes('exec') && process.env.TEST_PASSWORD_FAIL) process.exit(42)
  if (args.includes('ps') && args.includes('--quiet')) {
    const service = args.at(-1)
    process.stdout.write('container-' + service + (process.env.TEST_MULTIPLE_CONTAINERS === service ? '\\ncontainer-' + service + '-extra' : ''))
  }
  if (args.includes('up')) {
    const service = args.at(-1)
    if (process.env.TEST_FAIL_UP === service) process.exit(42)
    state.running[service] = state.tags['jaysylvester-' + service + ':production']
    save()
  }
  process.exit(0)
}
if (args[0] === 'volume' && args[1] === 'inspect' && (process.env.TEST_VOLUME_MISSING || !['fixture-logs', 'fixture-db'].includes(args.at(-1)))) process.exit(42)
if (args[0] === 'inspect') process.stdout.write(state.running[args.at(-1).replace('container-', '')])
if (args[0] === 'image' && args[1] === 'tag') { state.tags[args[3]] = args[2]; save() }
if (args[0] === 'build') {
  const tag = args[args.indexOf('--tag') + 1]
  if (process.env.TEST_FAIL_IMAGE && tag.includes('-' + process.env.TEST_FAIL_IMAGE + ':production')) process.exit(42)
  state.tags[tag] = 'new-' + tag
  save()
}
if (args[0] === 'run') {
  const result = require('node:child_process').spawnSync(process.execPath, args.slice(args.indexOf('node') + 1), {cwd: process.env.TEST_ROOT, stdio: 'inherit'})
  process.exit(result.status ?? 1)
}
`)
  fs.writeFileSync(path.join(root, 'scripts', 'smoke-test'), '#!/usr/bin/env node\n' + logging + 'record(\'smoke\'); process.exit(process.env.TEST_SMOKE_FAIL ? 42 : 0)', { mode: 0o755 })
  const environment = {
    ...process.env, PATH: path.join(root, 'bin') + path.delimiter + process.env.PATH,
    TEST_LOG: path.join(root, 'commands.jsonl'), TEST_ROOT: root, TEST_STATE: stateFile
  }
  const run = (args = ['deploy'], extra = {}) => childProcess.spawnSync(path.join(root, 'scripts', 'prod'), args, {
    cwd: os.tmpdir(), encoding: 'utf8', env: { ...environment, ...extra }
  })
  const commands = () => fs.existsSync(environment.TEST_LOG)
    ? fs.readFileSync(environment.TEST_LOG, 'utf8').trim().split('\n').map(line => JSON.parse(line)) : []
  return { root, run, commands, manifest, oldApp, oldProxy, state: () => JSON.parse(fs.readFileSync(stateFile)) }
}
const docker = f => f.commands().filter(command => command.tool === 'docker')
const replacements = f => docker(f).filter(command => command.args[0] === 'compose' && command.args.includes('up'))

test('production start uses existing images and containers from any caller directory', t => {
  const f = fixture(t)
  const result = f.run(['start', 'app'])
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(replacements(f)[0].args.slice(-7), ['up', '-d', 'app', '--no-build', '--pull', 'never', '--no-recreate'])
  assert.ok(docker(f).every(command => command.sudo))
  assert.ok(!docker(f).some(command => command.args[0] === 'build'))
})

test('production restart defaults to app/proxy and db requires explicit selection', t => {
  const f = fixture(t)
  assert.equal(f.run(['restart']).status, 0)
  assert.deepEqual(docker(f).at(-1).args.slice(-3), ['restart', 'app', 'proxy'])
  assert.equal(f.run(['restart', 'db']).status, 0)
  assert.deepEqual(docker(f).at(-1).args.slice(-2), ['restart', 'db'])
  assert.notEqual(f.run(['restart', '--all']).status, 0)
})

test('deploy retains both running images and builds both before replacing app then proxy', t => {
  const f = fixture(t)
  const result = f.run()
  assert.equal(result.status, 0, result.stderr)
  const commands = docker(f)
  const firstUp = commands.findIndex(command => command.args.includes('up'))
  for ( const service of ['app', 'proxy'] ) {
    const build = commands.findIndex(command => command.args[0] === 'build' && command.args.includes('jaysylvester-' + service + ':production'))
    assert.ok(build >= 0 && build < firstUp)
  }
  assert.deepEqual(replacements(f).map(command => command.args.at(-1)), ['app', 'proxy'])
  assert.ok(commands.every(command => command.sudo))
  assert.ok(!f.commands().some(command => command.tool === 'npm'))
  const pull = f.commands().filter(command => command.tool === 'git' && command.args[0] === 'pull')
  assert.deepEqual(pull.map(command => command.args), [['pull', '--ff-only', 'origin', 'main']])
  const retained = Object.entries(f.state().tags).filter(([tag]) => tag.includes(':rollback-'))
  assert.equal(retained.length, 2)
  assert.deepEqual(retained.map(([, image]) => image), [f.oldApp, f.oldProxy])
  assert.match(result.stdout, /fixture-revision/)
  assert.equal(f.commands().at(-1).tool, 'smoke')
})

test('deploy inspects only volumes when networks and secrets follow volume definitions', t => {
  const f = fixture(t)
  const result = f.run()
  assert.equal(result.status, 0, result.stderr)
  const inspected = docker(f).filter(command => command.args[0] === 'volume' && command.args[1] === 'inspect')
  assert.deepEqual(inspected.map(command => command.args.at(-1)), ['fixture-logs', 'fixture-db'])
})

for ( const service of ['app', 'proxy'] ) {
  test('deploy refuses multiple ' + service + ' containers before building or replacing services', t => {
    const f = fixture(t)
    const result = f.run(['deploy'], { TEST_MULTIPLE_CONTAINERS: service })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, new RegExp('Expected at most one ' + service + ' container'))
    assert.ok(!docker(f).some(command => command.args[0] === 'build'))
    assert.equal(replacements(f).length, 0)
    assert.deepEqual(f.state().running, { app: f.oldApp, proxy: f.oldProxy })
  })
}

for ( const drift of ['changed declaration', 'missing lock'] ) {
  test('deployment refuses ' + drift + ' without writing or resolving dependencies', t => {
    const f = fixture(t)
    if ( drift === 'missing lock' ) fs.unlinkSync(path.join(f.root, 'package-lock.json'))
    else {
      f.manifest.dependencies.example = 'git+https://example.invalid/repository#next'
      fs.writeFileSync(path.join(f.root, 'package.json'), JSON.stringify(f.manifest))
    }
    const lock = path.join(f.root, 'package-lock.json')
    const before = fs.existsSync(lock) ? fs.readFileSync(lock, 'utf8') : null
    const result = f.run()
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /out of sync/)
    assert.equal(replacements(f).length, 0)
    assert.ok(!f.commands().some(command => command.tool === 'npm'))
    assert.ok(!docker(f).some(command => command.args.includes('jaysylvester-app:production')))
    assert.equal(fs.existsSync(lock) ? fs.readFileSync(lock, 'utf8') : null, before)
  })
}

for ( const service of ['app', 'proxy'] ) {
  test(service + ' build failure preserves containers and both retained images', t => {
    const f = fixture(t)
    const result = f.run(['deploy'], { TEST_FAIL_IMAGE: service })
    assert.notEqual(result.status, 0)
    assert.equal(replacements(f).length, 0)
    assert.deepEqual(f.state().running, { app: f.oldApp, proxy: f.oldProxy })
    const retained = Object.entries(f.state().tags).filter(([tag]) => tag.includes(':rollback-'))
    assert.deepEqual(retained.map(([, image]) => image), [f.oldApp, f.oldProxy])
    if ( service === 'proxy' ) assert.equal(f.state().tags['jaysylvester-app:production'], 'new-jaysylvester-app:production')
    assert.match(result.stderr, /Production deployment failed/)
    assert.ok(docker(f).some(command => command.args.includes('logs')))
  })
}

for ( const extra of [{ TEST_VOLUME_MISSING: 'true' }, { TEST_SECRET_MISSING: 'true' }] ) {
  test('missing production storage or secrets stops deployment before builds', t => {
    const f = fixture(t)
    assert.notEqual(f.run(['deploy'], extra).status, 0)
    assert.equal(replacements(f).length, 0)
    assert.ok(!docker(f).some(command => command.args[0] === 'build'))
  })
}

test('branch, dirty-tree, and pull failures stop before Docker builds', t => {
  for ( const extra of [{ TEST_BRANCH: 'feature' }, { TEST_DIRTY: ' M package.json' }, { TEST_PULL_FAIL: 'true' }] ) {
    const f = fixture(t)
    assert.notEqual(f.run(['deploy'], extra).status, 0)
    assert.equal(docker(f).length, 0)
  }
})

test('retention tags are unique across consecutive deployment attempts', t => {
  const f = fixture(t)
  assert.equal(f.run().status, 0)
  assert.equal(f.run().status, 0)
  assert.equal(Object.keys(f.state().tags).filter(tag => tag.includes(':rollback-')).length, 4)
})

test('smoke failure reports state and leaves recovery to the operator', t => {
  const f = fixture(t)
  const result = f.run(['deploy'], { TEST_SMOKE_FAIL: 'true' })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Production deployment failed/)
  assert.deepEqual(replacements(f).map(command => command.args.at(-1)), ['app', 'proxy'])
})

test('app-password prompts for the configured app role without changing services or postgres', t => {
  const f = fixture(t)
  const result = f.run(['app-password'], { TEST_DB_USER: 'custom_app' })
  assert.equal(result.status, 0, result.stderr)
  const commands = docker(f)
  assert.equal(commands.length, 2)
  assert.ok(commands[0].args.includes('--environment'))
  assert.deepEqual(commands[1].args.slice(-9), [
    'exec', 'db', 'psql', '--username', 'postgres', '--dbname', 'postgres',
    '--command', '\\password "custom_app"'
  ])
  assert.ok(commands.every(command => command.sudo))
  assert.deepEqual(f.state().running, { app: f.oldApp, proxy: f.oldProxy })

  const admin = fixture(t)
  assert.equal(admin.run(['postgres-password']).status, 0)
  assert.equal(docker(admin).at(-1).args.at(-1), '\\password postgres')
})

test('app-password rejects arguments and missing, admin, or unsafe role names before exec', t => {
  const argumentsFixture = fixture(t)
  const argumentsResult = argumentsFixture.run(['app-password', 'unexpected'])
  assert.notEqual(argumentsResult.status, 0)
  assert.match(argumentsResult.stderr, /does not accept arguments/)
  assert.equal(docker(argumentsFixture).length, 0)

  for ( const user of ['', 'postgres', 'unsafe"; DROP ROLE postgres;'] ) {
    const f = fixture(t)
    const result = f.run(['app-password'], { TEST_DB_USER: user })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /DB_USER must name an application role/)
    assert.ok(!docker(f).some(command => command.args.includes('exec')))
  }
})

test('app-password returns psql failure without editing env or recreating services', t => {
  const f = fixture(t)
  const envPath = path.join(f.root, '.env')
  const before = fs.readFileSync(envPath, 'utf8')
  const result = f.run(['app-password'], { TEST_PASSWORD_FAIL: 'true' })
  assert.equal(result.status, 42)
  assert.equal(fs.readFileSync(envPath, 'utf8'), before)
  assert.equal(replacements(f).length, 0)
  assert.deepEqual(f.state().running, { app: f.oldApp, proxy: f.oldProxy })
})
