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

const renderCompose = files => render('docker', [
  'compose',
  '--env-file', envFile,
  '-p', project,
  ...files.flatMap(file => ['-f', file]),
  'config',
  '--format', 'json'
])

const developmentStandalone = renderCompose(['compose.yaml', 'compose.dev.yaml'])
const developmentEdge = renderCompose([
  'compose.yaml',
  'compose.dev.yaml',
  'compose.dev.edge.yaml'
])
const production = renderCompose(['compose.yaml', 'compose.production.yaml'])
const deployments = { developmentStandalone, developmentEdge, production }
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
      console.error(deployment + ' ' + serviceName + ' receives a database administrator credential.')
      process.exit(1)
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

  if (
    Object.keys(databaseEnvironment).some(key => key === 'POSTGRES_PASSWORD' || key === 'POSTGRES_PASSWORD_FILE')
    || databaseSecrets.some(secret => /admin/i.test(secret))
    || Object.keys(compose.secrets || {}).some(secret => /admin/i.test(secret))
  ) {
    console.error(deployment + ' retains a database administrator credential source.')
    process.exit(1)
  }

  if ( applicationUser === databaseEnvironment.POSTGRES_USER ) {
    console.error(deployment + ' uses the PostgreSQL bootstrap administrator as the application role.')
    process.exit(1)
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
    console.error(mode + ' development must publish PostgreSQL only on 127.0.0.1:' + databaseClientPort + '.')
    process.exit(1)
  }
}

for ( const target of [80, 443] ) {
  const port = publishedPort(developmentStandalone.services.proxy || {}, target)

  if ( port?.host_ip !== '127.0.0.1' || String(port?.published) !== String(target) ) {
    console.error('Standalone development must publish proxy port ' + target + ' on loopback.')
    process.exit(1)
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
  console.error('Edge development must remove proxy ports and join dev-edge as ' + edgeAlias + '.')
  process.exit(1)
}

for ( const serviceName of ['app', 'assets', 'db'] ) {
  if ( developmentEdge.services[serviceName]?.networks?.edge ) {
    console.error('Only the development proxy may join dev-edge; found ' + serviceName + '.')
    process.exit(1)
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
    console.error(
      edgeConfigPath + ' must route ' + developmentHostname + ' to ' + expectedTarget
    )
    process.exit(1)
  }
}

console.log('Compose boundaries passed for standalone development, edge development, and production.')
