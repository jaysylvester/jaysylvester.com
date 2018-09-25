// _header controller

'use strict'

module.exports = {
  handler: handler
}


// default action
function handler(params, context, emitter) {
  emitter.emit('ready')
}
