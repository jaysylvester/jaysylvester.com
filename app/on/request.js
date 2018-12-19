// Request events

'use strict'

module.exports = {
  start: start
}


async function start() {
  return {
    cache: {
      route: {
        lifespan: 'application'
      }
    }
  }
}
