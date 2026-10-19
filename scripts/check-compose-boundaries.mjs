#!/usr/bin/env node

import childProcess from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const project = 'jaysylvester'
const developmentHostname = 'dev.jaysylvester.com'
const edgeAlias = 'jaysylvester-proxy'
const databaseClientPort = '5432'
const envFile = '.env.example'

const fail = message => {
  console.error(message)
  process.exit(1)
}

const render = (command, args, environment = process.env) => {
  const result = childProcess.spawnSync(command, args, {
    encoding: 'utf8',
    env: environment
  })

  if ( result.status !== 0 ) {
    process.stderr.write(result.stderr)
    process.exit(result.status || 1)
  }

  return JSON.parse(result.stdout)
}

const renderCompose = (files, environment = process.env) => render('docker', [
  'compose',
  '--env-file', envFile,
  '-p', project,
  ...files.flatMap(file => ['-f', file]),
  'config',
  '--format', 'json'
], environment)

const developmentStandalone = renderCompose(['compose.yaml', 'compose.dev.yaml'])
const developmentEdge = renderCompose([
  'compose.yaml',
  'compose.dev.yaml',
  'compose.dev.edge.yaml'
])
const production = renderCompose(['compose.yaml', 'compose.production.yaml'])
const deployments = { developmentStandalone, developmentEdge, production }

for (const [environmentVariableName, secretName] of [
  ['DB_PASSWORD', 'db-password'], ['MAIL_AUTH_PASS', 'mail-auth-pass']
]) {
  const app = production.services.app
  const granted = app.secrets.map(secret => typeof secret === 'string' ? secret : secret.source)
  if (
    production.secrets[secretName]?.environment !== environmentVariableName
    || app.environment[environmentVariableName + '_FILE'] !== '/run/secrets/' + secretName
    || Object.hasOwn(app.environment, environmentVariableName)
    || !granted.includes(secretName)
  ) {
    fail('Production must source ' + secretName + ' from host .env and grant only its file to app.')
  }
}
const forbidden = new Set([
  'DB_ADMIN_PASSWORD',
  'DB_ADMIN_PASSWORD_FILE',
  'POSTGRES_PASSWORD',
  'POSTGRES_PASSWORD_FILE'
])

for ( const [deployment, compose] of Object.entries(deployments) ) {
  for ( const serviceName of ['app', 'assets', 'proxy'] ) {
    const service = compose.services[serviceName] || {}
    const environment = service.environment || {}
    const leaked = Object.keys(environment).filter(key => forbidden.has(key))
    const adminSecrets = (service.secrets || [])
      .map(secret => typeof secret === 'string' ? secret : secret.source)
      .filter(secret => /admin/i.test(secret))

    if ( leaked.length || adminSecrets.length ) {
      fail(deployment + ' ' + serviceName + ' receives a database administrator credential.')
    }
  }
}

for ( const [deployment, compose] of Object.entries(deployments) ) {
  const database = compose.services.db || {}
  const databaseEnvironment = database.environment || {}
  const applicationUser = compose.services.app?.environment?.DB_USER
    || databaseEnvironment.DB_USER
  const databaseSecrets = (database.secrets || [])
    .map(secret => typeof secret === 'string' ? secret : secret.source)
  const databasePasswordInputs = Object.keys(databaseEnvironment)
    .filter(key => /PASSWORD(?:_FILE)?$/u.test(key))

  if (
    databasePasswordInputs.length
    || databaseSecrets.length
    || Object.keys(compose.secrets || {}).some(secret => /admin/i.test(secret))
  ) {
    fail(deployment + ' gives the normal database service a password input or secret.')
  }

  if ( applicationUser === databaseEnvironment.POSTGRES_USER ) {
    fail(deployment + ' uses the PostgreSQL bootstrap administrator as the application role.')
  }
}

if ( /^name\s*:/mu.test(fs.readFileSync('compose.yaml', 'utf8')) ) {
  fail('compose.yaml must not declare a project name; scripts/dev is the sole project-name source.')
}


for ( const [deployment, compose] of Object.entries(deployments) ) {
  const target = deployment === 'production' ? 'production' : 'development'
  for ( const name of ['app', 'proxy', 'assets'] ) {
    const service = compose.services[name]
    if ( !service ) continue
    const image = project + '-' + (name === 'assets' ? 'app' : name) + ':' + target
    if ( service.build || service.image !== image || service.pull_policy !== 'never' ) {
      fail(deployment + ' ' + name + ' must use its prebuilt image with pull_policy: never.')
    }
  }
  const database = compose.services.db
  if ( database.volumes?.some(volume => volume.target?.startsWith('/docker-entrypoint-initdb.d')) ) {
    fail(deployment + ' mounts an initialization hook in the normal database service.')
  }
  if ( !database.healthcheck?.test.join(' ').includes('127.0.0.1') || !database.healthcheck.start_period ) {
    fail(deployment + ' must use TCP database readiness with a startup grace period.')
  }
  if ( deployment === 'production' && Object.values(compose.volumes).some(volume => !volume.external) ) {
    fail('Production data volumes must be external.')
  }
}

const publishedPort = (service, target) => (service.ports || [])
  .find(port => Number(port.target) === target)

for ( const [mode, compose] of Object.entries({
  standalone: developmentStandalone,
  edge: developmentEdge
}) ) {
  const databasePort = publishedPort(compose.services.db || {}, 5432)

  if (
    databasePort?.host_ip !== '127.0.0.1'
    || String(databasePort?.published) !== databaseClientPort
  ) {
    fail(mode + ' development must publish PostgreSQL only on 127.0.0.1:' + databaseClientPort + '.')
  }
}

for ( const target of [80, 443] ) {
  const port = publishedPort(developmentStandalone.services.proxy || {}, target)

  if ( port?.host_ip !== '127.0.0.1' || String(port?.published) !== String(target) ) {
    fail('Standalone development must publish proxy port ' + target + ' on loopback.')
  }
}

const edgeProxy = developmentEdge.services.proxy || {}
const edgeNetwork = developmentEdge.networks.edge || {}
const edgeAliases = edgeProxy.networks?.edge?.aliases || []

if (
  (edgeProxy.ports || []).length
  || edgeNetwork.name !== 'dev-edge'
  || edgeNetwork.external !== true
  || !edgeAliases.includes(edgeAlias)
) {
  fail('Edge development must remove proxy ports and join dev-edge as ' + edgeAlias + '.')
}

for ( const serviceName of ['app', 'assets', 'db'] ) {
  if ( developmentEdge.services[serviceName]?.networks?.edge ) {
    fail('Only the development proxy may join dev-edge; found ' + serviceName + '.')
  }
}

const edgeConfigPath = process.env.DEV_EDGE_NGINX_CONFIG
  || path.join(os.homedir(), 'Projects', 'dev-edge', 'nginx.conf')

if ( fs.existsSync(edgeConfigPath) ) {
  const expectedTarget = edgeAlias + ':443;'
  const routeExists = fs.readFileSync(edgeConfigPath, 'utf8')
    .split(/\r?\n/u)
    .some(line => {
      const fields = line.trim().split(/\s+/u)

      return fields.length === 2
        && fields[0] === developmentHostname
        && fields[1] === expectedTarget
    })

  if ( !routeExists ) {
    fail(
      edgeConfigPath + ' must route ' + developmentHostname + ' to ' + expectedTarget
    )
  }
}

const initializer = fs.readFileSync('docker/postgres/init-app-role.sh', 'utf8')
if ( !initializer.includes('NOBYPASSRLS') ) {
  fail('The application-role initializer must explicitly set NOBYPASSRLS.')
}

const grantSql = fs.readFileSync('scripts/sql/grant-app-role.sql', 'utf8')
const begin = grantSql.indexOf('BEGIN;')
const commit = grantSql.lastIndexOf('COMMIT;')
if (
  begin < 0
  || commit < begin
  || !grantSql.includes('rolsuper')
  || !grantSql.includes('rolbypassrls')
) {
  fail('The grant operation must be transactional and guard both administrator and application roles.')
}

const developmentNginx = fs.readFileSync('docker/nginx/dev.conf', 'utf8')
if ( !/add_header\s+Cache-Control\s+"no-store"\s+always;/u.test(developmentNginx) ) {
  fail('Development static responses must set Cache-Control: no-store with the always parameter.')
}

const readCapturedArguments = captureFile => {
  const captured = fs.readFileSync(captureFile, 'utf8').trim()

  return captured ? captured.split('\n') : []
}

const contractRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jaysylvester-dev-contract-'))

try {
  const scriptsDirectory = path.join(contractRoot, 'scripts')
  const binaryDirectory = path.join(contractRoot, 'bin')
  const captureFile = path.join(contractRoot, 'docker-arguments')
  fs.mkdirSync(scriptsDirectory)
  fs.mkdirSync(binaryDirectory)
  fs.copyFileSync('scripts/dev', path.join(scriptsDirectory, 'dev'))
  fs.copyFileSync('scripts/build', path.join(scriptsDirectory, 'build'))
  fs.chmodSync(path.join(scriptsDirectory, 'build'), 0o755)
  fs.chmodSync(path.join(scriptsDirectory, 'dev'), 0o755)
  fs.writeFileSync(path.join(scriptsDirectory, 'dev-dependencies'), '#!/bin/sh\nexit 0\n', { mode: 0o755 })
  fs.writeFileSync(path.join(contractRoot, '.env'), 'NODE_ENV=development\n')
  fs.writeFileSync(path.join(binaryDirectory, 'docker'), `#!/bin/sh
printf '%s\\n' "$@" >> "$CAPTURE_FILE"
`)
  fs.chmodSync(path.join(binaryDirectory, 'docker'), 0o755)

  const contractEnvironment = {
    ...process.env,
    CAPTURE_FILE: captureFile,
    PATH: binaryDirectory + path.delimiter + process.env.PATH
  }

  // Exercise the real initializer with a fake psql; no database is contacted.
  const passwordSource = path.join(contractRoot, 'dummy-password')
  const passwordCapture = path.join(contractRoot, 'captured-password')
  fs.writeFileSync(path.join(binaryDirectory, 'psql'), `#!/bin/sh
for argument do
  case "$argument" in
    --set=app_password=*) printf '%s' "\${argument#--set=app_password=}" > "$PASSWORD_CAPTURE_FILE" ;;
  esac
done
`, { mode: 0o755 })
  const runInitializer = () => childProcess.spawnSync('sh', [
    path.resolve('docker/postgres/init-app-role.sh')
  ], {
    cwd: contractRoot,
    encoding: 'utf8',
    env: {
      ...contractEnvironment,
      DB_USER: 'fixture_app', POSTGRES_USER: 'postgres', POSTGRES_DB: 'fixture_db',
      POSTGRES_TIMEZONE: 'UTC', DB_PASSWORD: 'unused-direct-fixture-value',
      DB_PASSWORD_FILE: passwordSource, PASSWORD_CAPTURE_FILE: passwordCapture
    }
  })
  for ( const [content, expected] of [
    ['fixture spaces \t', 'fixture spaces \t'],
    ['fixture spaces \t\n', 'fixture spaces \t'],
    ['fixture spaces \t\r\n', 'fixture spaces \t'],
    ['first \nlast \t\n', 'first \nlast \t'],
    ['fixture \n\n', 'fixture \n'],
    ['fixture\r\n\r\n', 'fixture\r\n'],
    ['fixture\r', 'fixture\r'],
    ['fixture.', 'fixture.']
  ] ) {
    fs.writeFileSync(passwordSource, content)
    fs.rmSync(passwordCapture, { force: true })
    const initialized = runInitializer()
    if ( initialized.status !== 0 || fs.readFileSync(passwordCapture, 'utf8') !== expected ) {
      throw new Error('Initializer password files must preserve whitespace and remove only one final LF or CRLF.')
    }
  }
  fs.rmSync(passwordSource)
  fs.rmSync(passwordCapture)
  if ( runInitializer().status === 0 || fs.existsSync(passwordCapture) ) {
    throw new Error('An unreadable initializer password file must fail without falling back to the direct value.')
  }

  const runDev = args => childProcess.spawnSync(path.join(scriptsDirectory, 'dev'), args, {
    cwd: contractRoot,
    encoding: 'utf8',
    env: contractEnvironment
  })

  fs.writeFileSync(captureFile, '')
  const restart = runDev(['restart'])
  const restartArguments = readCapturedArguments(captureFile)
  if (
    restart.status !== 0
    || restartArguments.slice(-8).join(' ') !== 'up --detach --no-build --no-deps --force-recreate app proxy assets'
    || restartArguments.includes('db')
    || restartArguments.includes('stop')
    || !restartArguments.includes('build')
  ) {
    fail('Default restart must build and recreate only app, proxy, and assets, leaving db untouched.')
  }

  fs.writeFileSync(captureFile, '')
  const databaseRestart = runDev(['restart', 'db'])
  const databaseRestartArguments = readCapturedArguments(captureFile)
  if (
    databaseRestart.status !== 0
    || databaseRestartArguments.slice(-2).join(' ') !== 'restart db'
  ) {
    fail('Database restart must remain available only when db is named explicitly.')
  }

  fs.writeFileSync(captureFile, '')
  const destroy = runDev(['destroy'])
  const destroyArguments = readCapturedArguments(captureFile)
  if ( destroy.status !== 0 || destroyArguments.at(-1) !== 'down' ) {
    fail('destroy must map to Compose down without volume deletion.')
  }

  fs.writeFileSync(captureFile, '')
  const destructiveDestroy = runDev(['destroy', '--volumes'])
  if ( destructiveDestroy.status === 0 || readCapturedArguments(captureFile).length ) {
    fail('destroy must reject arguments before invoking Compose.')
  }

  const restoreRoot = path.join(contractRoot, 'restore')
  const restoreScripts = path.join(restoreRoot, 'scripts')
  const backupFile = path.join(restoreRoot, 'backup.dump')
  fs.mkdirSync(restoreScripts, { recursive: true })
  fs.copyFileSync('scripts/dev-db-restore', path.join(restoreScripts, 'dev-db-restore'))
  fs.chmodSync(path.join(restoreScripts, 'dev-db-restore'), 0o755)
  fs.writeFileSync(backupFile, 'contract fixture')
  fs.writeFileSync(path.join(restoreRoot, '.env'), '# Test fixture\n')
  fs.writeFileSync(path.join(restoreScripts, 'dev'), `#!/bin/sh
if test "$1 $2 $3" = 'compose config --quiet'; then
  exit 0
fi
if test "$1 $2 $3 $4 $5" = 'compose ps --status running --services'; then
  echo "\${RUNNING_SERVICE:-app}"
  exit 0
fi
echo "Unexpected restore helper call: $*" >&2
exit 90
`)
  fs.chmodSync(path.join(restoreScripts, 'dev'), 0o755)

  const relativeDatabaseRestore = childProcess.spawnSync(
    path.join(restoreScripts, 'dev-db-restore'),
    ['backup.dump'],
    {
      cwd: restoreRoot,
      encoding: 'utf8',
      env: process.env
    }
  )
  if (
    relativeDatabaseRestore.status === 0
    || !relativeDatabaseRestore.stderr.includes('absolute archive path')
  ) {
    fail('Database restore must reject a relative archive path before invoking Compose.')
  }

  for ( const serviceName of ['app', 'proxy'] ) {
    const restore = childProcess.spawnSync(
      path.join(restoreScripts, 'dev-db-restore'),
      [backupFile],
      {
        cwd: restoreRoot,
        encoding: 'utf8',
        env: { ...process.env, RUNNING_SERVICE: serviceName }
      }
    )
    if ( restore.status === 0 || !restore.stderr.includes(serviceName + ' is running') ) {
      fail('Database restore must refuse to run while app or proxy is running.')
    }


  }
} finally {
  fs.rmSync(contractRoot, { recursive: true, force: true })
}

console.log('Compose and development command boundaries passed for standalone, edge, and provisional production modes.')
