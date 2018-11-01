// +_layout controller

'use strict'

module.exports = {
  handler: handler
}


// default action
function handler(params, context, emitter) {
  emitter.emit('ready', {
    include: {
      head: {
        controller: '_head'
      },
      header: {
        controller: '_header'
      },
      footer: {
        controller: '_footer'
      }
    }
  })
}
