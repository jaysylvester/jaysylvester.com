import assert from 'node:assert/strict'
import childProcess from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { parseEnv } from 'node:util'
import { fileURLToPath } from 'node:url'

const helperUrl = new URL('../app/helpers/secrets.js', import.meta.url).href
const run = (code, environment = {}) => childProcess.spawnSync(process.execPath, [
  '--input-type=module', '-e',
  'import assert from \'node:assert/strict\'; import { readSecret } from ' + JSON.stringify(helperUrl) + ';\n' + code
], { encoding: 'utf8', env: { PATH: process.env.PATH, ...environment } })
const fixture = t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'citizen-secret-test-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  return root
}

for (const mode of ['development', 'production']) {
  test('direct environment credentials work without Docker in ' + mode, () => {
    const result = run('assert.equal(readSecret(\'TEST_PASSWORD\'), \'direct $value with spaces \')', {
      NODE_ENV: mode, TEST_PASSWORD: 'direct $value with spaces '
    })
    assert.equal(result.status, 0, result.stderr)
  })

  test('file credentials work in ' + mode + ' and remove only the final line ending', t => {
    const filePath = path.join(fixture(t), 'password with spaces')
    fs.writeFileSync(filePath, 'file $value with spaces \r\n')
    const result = run('assert.equal(readSecret(\'TEST_PASSWORD\'), \'file $value with spaces \')', {
      NODE_ENV: mode, TEST_PASSWORD_FILE: filePath
    })
    assert.equal(result.status, 0, result.stderr)
  })
}

test('an explicit file takes precedence over a direct value', t => {
  const filePath = path.join(fixture(t), 'password')
  fs.writeFileSync(filePath, 'file-value')
  const result = run('assert.equal(readSecret(\'TEST_PASSWORD\'), \'file-value\')', {
    TEST_PASSWORD: 'direct-value', TEST_PASSWORD_FILE: filePath
  })
  assert.equal(result.status, 0, result.stderr)
})

test('an unreadable explicit file fails without falling back to the direct value', t => {
  const result = run('assert.throws(() => readSecret(\'TEST_PASSWORD\'), { code: \'ENOENT\' })', {
    TEST_PASSWORD: 'direct-value', TEST_PASSWORD_FILE: path.join(fixture(t), 'missing')
  })
  assert.equal(result.status, 0, result.stderr)
})

for (const value of [undefined, '']) {
  test('a missing or empty credential reports the accepted environment names', () => {
    const result = run('assert.throws(() => readSecret(\'TEST_PASSWORD\'), { message: \'Missing required environment variable: TEST_PASSWORD or TEST_PASSWORD_FILE\' })', {
      ...(value === undefined ? {} : { TEST_PASSWORD: value })
    })
    assert.equal(result.status, 0, result.stderr)
  })
}

const importer = new URL('./migrate-source-config.mjs', import.meta.url)
if (fs.existsSync(importer)) {
  for (const includeMail of [true, false]) {
    test('legacy import preserves available mail credentials: ' + includeMail, t => {
      const root = fixture(t)
      const sourcePath = path.join(root, 'source.json')
      fs.writeFileSync(sourcePath, JSON.stringify({ comitium: {
        db: { password: 'fixture-db-value' },
        mail: includeMail ? { auth: { pass: 'fixture$mail value' } } : {},
        adminPassword: 'fixture-admin-value'
      } }))
      const result = childProcess.spawnSync(process.execPath, [fileURLToPath(importer), sourcePath], {
        cwd: root, encoding: 'utf8'
      })
      assert.equal(result.status, 0, result.stderr)
      const filePath = path.join(root, '.env')
      const env = parseEnv(fs.readFileSync(filePath, 'utf8'))
      assert.equal(env.DB_PASSWORD, 'fixture-db-value')
      assert.equal(env.MAIL_AUTH_PASS, includeMail ? 'fixture$mail value' : '')
      assert.ok(!Object.values(env).includes('fixture-admin-value'))
      assert.equal(fs.statSync(filePath).mode & 0o777, 0o600)
      for (const value of ['fixture-db-value', 'fixture$mail value', 'fixture-admin-value']) {
        assert.ok(!(result.stdout + result.stderr).includes(value))
      }
      const before = fs.readFileSync(filePath, 'utf8')
      const repeated = childProcess.spawnSync(process.execPath, [fileURLToPath(importer), sourcePath], {
        cwd: root, encoding: 'utf8'
      })
      assert.notEqual(repeated.status, 0)
      assert.equal(fs.readFileSync(filePath, 'utf8'), before)
    })
  }
}
