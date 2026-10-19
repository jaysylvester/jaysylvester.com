import assert from 'node:assert/strict'
import childProcess from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

const fixture = t => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'citizen-db-test-')))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  fs.mkdirSync(path.join(root, 'scripts'))
  fs.mkdirSync(path.join(root, 'bin'))
  for ( const name of ['dev', 'dev-db-initialize', 'dev-db-backup', 'dev-db-restore'] ) {
    fs.copyFileSync(new URL(name, import.meta.url), path.join(root, 'scripts', name))
  }
  fs.writeFileSync(path.join(root, '.env'), '# Fixture only\n')
  fs.writeFileSync(path.join(root, 'backup.dump'), 'fixture archive')
  const stateFile = path.join(root, 'state.json')
  fs.writeFileSync(stateFile, JSON.stringify({ running: { db: true }, objects: 0 }))
  const log = path.join(root, 'commands.jsonl')
  fs.writeFileSync(path.join(root, 'bin', 'docker'), `#!/usr/bin/env node
const fs = require('node:fs')
const args = process.argv.slice(2)
fs.appendFileSync(process.env.TEST_LOG, JSON.stringify(args) + '\\n')
const state = JSON.parse(fs.readFileSync(process.env.TEST_STATE))
const save = () => fs.writeFileSync(process.env.TEST_STATE, JSON.stringify(state))
if (args[0] === 'info' && process.env.TEST_DOCKER_DOWN) process.exit(42)
if (args[0] === 'volume' && args[1] === 'inspect' && process.env.TEST_VOLUME_ABSENT) process.exit(1)
if (args[0] === 'compose') {
  if (args.includes('config') && args.includes('--environment')) process.stdout.write('DB_PASSWORD=fixture-only\\n')
  else if (args.includes('config') && !args.includes('--quiet')) process.stdout.write('volumes:\\n  postgres-data:\\n    name: selected-fixture-volume\\n')
  if (args.includes('ps') && args.includes('--services')) {
    const service = args.at(-1)
    if (state.running[service]) process.stdout.write(service)
  }
  if (args.includes('up')) { state.running.db = true; save() }
  if (args.includes('stop')) { state.running.db = false; save() }
  const command = args.join(' ')
  if (command.includes('pg_dump')) process.stdout.write(process.env.TEST_EMPTY_DUMP ? '' : 'fixture archive')
  if (command.includes('pg_restore --list') && process.env.TEST_INVALID_ARCHIVE) process.exit(42)
  if (command.includes('SELECT count(*)')) process.stdout.write(String(state.objects))
}
`, { mode: 0o755 })
  fs.writeFileSync(path.join(root, 'bin', 'shasum'), `#!/usr/bin/env node
if (process.env.TEST_CHECKSUM_FAIL) process.exit(42)
const fs = require('node:fs')
const file = process.argv.at(-1)
process.stdout.write(require('node:crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex') + '  ' + file + '\\n')
`, { mode: 0o755 })
  const environment = {
    ...process.env, PATH: path.join(root, 'bin') + path.delimiter + process.env.PATH,
    TEST_LOG: log, TEST_STATE: stateFile, DEV_DB_BACKUP_PARENT: path.join(root, 'protected-backups')
  }
  const run = (name, args = [], extra = {}) => childProcess.spawnSync('sh', [path.join(root, 'scripts', name), ...args], {
    cwd: os.tmpdir(), env: { ...environment, ...extra }, encoding: 'utf8'
  })
  const state = () => JSON.parse(fs.readFileSync(stateFile))
  const setState = value => fs.writeFileSync(stateFile, JSON.stringify(value))
  const commands = () => fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line)) : []
  return { root, run, state, setState, commands, backupDirectory: path.join(environment.DEV_DB_BACKUP_PARENT, 'backups') }
}

test('existing database volume is resolved from Compose without prompting or initialization', t => {
  const f = fixture(t)
  const result = f.run('dev-db-initialize')
  assert.equal(result.status, 0, result.stderr)
  assert.ok(f.commands().some(args => args.join(' ') === 'volume inspect selected-fixture-volume'))
  assert.ok(!f.commands().some(args => args.includes('create') || args.includes('run')))
})

test('unavailable Docker and a noninteractive first initialization fail before creating data', t => {
  for ( const extra of [{ TEST_DOCKER_DOWN: 'true' }, { TEST_VOLUME_ABSENT: 'true' }] ) {
    const f = fixture(t)
    const result = f.run('dev-db-initialize', [], extra)
    assert.notEqual(result.status, 0)
    assert.ok(!f.commands().some(args => args.includes('create') || args.includes('run')))
  }
})

test('backup publishes a protected archive and matching checksum from any caller directory', t => {
  const f = fixture(t)
  const result = f.run('dev-db-backup')
  assert.equal(result.status, 0, result.stderr)
  const files = fs.readdirSync(f.backupDirectory)
  assert.equal(files.length, 2)
  const archive = files.find(name => name.endsWith('.dump'))
  const checksum = fs.readFileSync(path.join(f.backupDirectory, archive + '.sha256'), 'utf8')
  assert.ok(checksum.endsWith('  ' + path.join(f.backupDirectory, archive) + '\n'))
  assert.equal(fs.statSync(f.backupDirectory).mode & 0o777, 0o700)
  for ( const file of files ) assert.equal(fs.statSync(path.join(f.backupDirectory, file)).mode & 0o777, 0o600)
})

for ( const extra of [{ TEST_EMPTY_DUMP: 'true' }, { TEST_INVALID_ARCHIVE: 'true' }, { TEST_CHECKSUM_FAIL: 'true' }] ) {
  test('failed backup removes partial archive/checksum output', t => {
    const f = fixture(t)
    assert.notEqual(f.run('dev-db-backup', [], extra).status, 0)
    assert.deepEqual(fs.readdirSync(f.backupDirectory), [])
  })
}

test('restore rejects a relative archive before accessing Docker', t => {
  const f = fixture(t)
  assert.notEqual(f.run('dev-db-restore', ['backup.dump']).status, 0)
  assert.equal(f.commands().length, 0)
})

for ( const service of ['app', 'proxy'] ) {
  test('restore refuses a running ' + service + ' before starting or modifying db', t => {
    const f = fixture(t)
    f.setState({ running: { [service]: true }, objects: 0 })
    const result = f.run('dev-db-restore', [path.join(f.root, 'backup.dump')])
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /is running/)
    assert.ok(!f.commands().some(args => args.includes('up') || args.includes('exec')))
  })
}

test('restore refuses nonempty user relations and returns a previously stopped db to stopped', t => {
  const f = fixture(t)
  f.setState({ running: { db: false }, objects: 2 })
  const result = f.run('dev-db-restore', [path.join(f.root, 'backup.dump')])
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /user relations/)
  assert.equal(f.state().running.db, false)
  assert.ok(f.commands().some(args => args.join(' ').includes('\'v\', \'m\', \'S\', \'f\'')))
})

test('invalid archive preserves a previously running database', t => {
  const f = fixture(t)
  const result = f.run('dev-db-restore', [path.join(f.root, 'backup.dump')], { TEST_INVALID_ARCHIVE: 'true' })
  assert.notEqual(result.status, 0)
  assert.equal(f.state().running.db, true)
  assert.ok(!f.commands().some(args => args.includes('stop')))
})

test('initializer failure still restores the original stopped service state', t => {
  const f = fixture(t)
  f.setState({ running: { db: false }, objects: 0 })
  fs.writeFileSync(path.join(f.root, 'scripts', 'dev-db-initialize'), '#!/bin/sh\n./scripts/dev compose up -d --wait db\nexit 42\n', { mode: 0o755 })
  assert.notEqual(f.run('dev-db-restore', [path.join(f.root, 'backup.dump')]).status, 0)
  assert.equal(f.state().running.db, false)
})
