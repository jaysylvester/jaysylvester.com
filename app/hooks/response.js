// response events

'use strict'

module.exports = {
  start: start
}


function start() {
  return {
    cache: {
      route: {
        lifespan: 'application'
      }
    }
  }
}
