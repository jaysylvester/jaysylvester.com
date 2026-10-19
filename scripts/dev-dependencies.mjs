#!/usr/bin/env node

import childProcess from 'node:child_process'
import fs from 'node:fs'
import { dirname } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { fileURLToPath } from 'node:url'

const manifestPath = new URL('../package.json', import.meta.url)
const lockPath = new URL('../package-lock.json', import.meta.url)
const root = dirname(fileURLToPath(manifestPath))
const dependencyFields = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']

const run = args => {
  const result = childProcess.spawnSync('npm', args, { cwd: root, stdio: 'inherit' })

  if ( result.error ) {
    throw result.error
  }

  if ( result.status !== 0 ) {
    throw new Error('npm dependency preparation failed; the app was not started.')
  }
}

try {
  const arguments_ = process.argv.slice(2)
  const updates = new Set()
  let check = false
  for ( let index = 0; index < arguments_.length; index++ ) {
    const argument = arguments_[index]
    if ( argument === '--check' ) {
      check = true
    } else if ( argument === '--update' ) {
      const name = arguments_[++index]
      if ( !name || name.startsWith('-') ) {
        throw new Error('--update requires a dependency name.')
      }
      updates.add(name)
    } else {
      throw new Error('Usage: dev-dependencies.mjs [--check] [--update PACKAGE]')
    }
  }
  if ( check && updates.size ) {
    throw new Error('--check cannot be combined with --update.')
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  for ( const name of updates ) {
    if ( !dependencyFields.some(field => Object.hasOwn(manifest[field] || {}, name)) ) {
      throw new Error('Cannot update undeclared dependency: ' + name)
    }
  }
  const lock = fs.existsSync(lockPath) ? JSON.parse(fs.readFileSync(lockPath, 'utf8')) : null
  const lockedManifest = lock?.packages?.['']
  const fields = [...dependencyFields, 'peerDependenciesMeta', 'engines', 'name', 'version']
  const synchronized = lockedManifest && fields.every(field => isDeepStrictEqual(
    manifest[field] ?? (dependencyFields.includes(field) ? {} : undefined),
    lockedManifest[field] ?? (dependencyFields.includes(field) ? {} : undefined)
  ))

  if ( check && !synchronized ) {
    throw new Error('package-lock.json is missing or out of sync with package.json. Run ./scripts/build locally and commit both files before deployment.')
  }

  if ( !synchronized || updates.size ) {
    const changedDependencies = [...new Set(dependencyFields.flatMap(field =>
      Object.keys(manifest[field] || {}).filter(name =>
        manifest[field][name] !== lockedManifest?.[field]?.[name]
      )
    ))].sort()

    const requestedDependencies = [...new Set([...changedDependencies, ...updates])].sort()
    console.log(updates.size
      ? 'Refreshing dependencies with Docker npm: ' + [...updates].join(', ')
      : 'Package declarations changed; updating package-lock.json with Docker npm...')

    // Updating changed declarations explicitly also re-resolves a changed Git
    // branch, or fetches a newer commit from an unchanged branch when requested.
    // Removed dependencies and metadata-only edits need an install, not an update.
    const npmArgs = requestedDependencies.length && lockedManifest
      ? ['update', ...requestedDependencies]
      : ['install']

    run([
      ...npmArgs, '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'
    ])

    // npm can canonicalize GitHub resolutions to SSH. Preserve the manifest's
    // HTTPS transport so the image build does not need a developer SSH key.
    const updatedLock = JSON.parse(fs.readFileSync(lockPath, 'utf8'))
    let normalized = false

    for ( const field of dependencyFields ) {
      for ( const [name, spec] of Object.entries(manifest[field] || {}) ) {
        const entry = updatedLock.packages?.['node_modules/' + name]

        if ( spec.startsWith('git+https://') && entry?.resolved?.startsWith('git+') ) {
          const commit = entry.resolved.split('#')[1]
          const resolved = spec.split('#')[0] + (commit ? '#' + commit : '')

          if ( resolved !== entry.resolved ) {
            entry.resolved = resolved
            normalized = true
          }
        }
      }
    }

    if ( normalized ) {
      fs.writeFileSync(lockPath, JSON.stringify(updatedLock, null, 2) + '\n')
    }

    for ( const name of updates ) {
      const describe = entry => entry?.resolved?.match(/#([a-f0-9]{40})$/)?.[1]
        || entry?.version || 'not installed'
      const before = describe(lock?.packages?.['node_modules/' + name])
      const after = describe(updatedLock.packages?.['node_modules/' + name])
      console.log(name + ': ' + (before === after ? after + ' (unchanged)' : before + ' -> ' + after))
    }
  }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
