// work-history controller

'use strict'

module.exports = {
  handler: handler
}


// default action
function handler(params, context, emitter) {
  app.listen({
    employers: function (emitter) {
      app.models['work-history'].employers(emitter)
    }
  }, function (output) {
    if ( output.listen.success ) {
      emitter.emit('ready', {
        content: output
      })
    } else {
      emitter.emit('error', output.listen)
    }
  })
}
