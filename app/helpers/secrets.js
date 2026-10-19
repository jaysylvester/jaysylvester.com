import fs from 'node:fs'

export const readSecret = (environmentVariableName) => {
  const fileEnvironmentVariableName = environmentVariableName + '_FILE'

  if (process.env[fileEnvironmentVariableName]) {
    return fs.readFileSync(process.env[fileEnvironmentVariableName], 'utf8').replace(/\r?\n$/, '')
  }

  if (!process.env[environmentVariableName]) {
    throw new Error('Missing required environment variable: ' + environmentVariableName + ' or ' + fileEnvironmentVariableName)
  }

  return process.env[environmentVariableName]
}
