// Request start

'use strict'

module.exports = {
  start: start
}

function start(params, context, emitter) {
  emitter.emit('ready', {
    cache: {
      route: {
        lifespan: 'application'
      }
    }
  })
}