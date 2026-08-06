// utility helpers

import fs from 'fs'

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random#Getting_a_random_integer_between_two_values_inclusive
export const getRandomIntInclusive = (min, max) => {
  min = Math.ceil(min)
  max = Math.floor(max)
  // The maximum is inclusive and the minimum is inclusive
  return Math.floor(Math.random() * (max - min + 1)) + min
}


export const requiredEnvironment = (name) => {
  if ( !process.env[name] ) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return process.env[name]
}


export const requiredSecret = (name, environmentName) => {
  const filename = `/run/secrets/${name}`

  if ( !fs.existsSync(filename) ) {
    return requiredEnvironment(environmentName)
  }

  try {
    const value = fs.readFileSync(filename, 'utf8').replace(/\r?\n$/, '')

    if ( !value ) {
      throw new Error('Secret is empty')
    }

    return value
  } catch (err) {
    throw new Error(`Missing or unreadable required secret: ${name}`, { cause: err })
  }
}
