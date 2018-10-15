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
    emitter.emit('ready', {
      content: output,
      include: {
        header: {
          controller: '_header'
        },
        footer: {
          controller: '_footer'
        }
      }
    })
  })
}
