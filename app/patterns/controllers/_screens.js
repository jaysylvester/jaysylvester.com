// _screens controller

'use strict'

module.exports = {
  handler: handler
}


// default action
function handler(params, context, emitter) {
  app.listen({
    screens: function (emitter) {
      if ( params.url.company ) {
        app.models.screens.companyScreens(params.url.company, emitter)
      } else {
        app.models.screens.screens(emitter)
      }
    }
  }, function (output) {
    if ( output.listen.success ) {
      emitter.emit('ready', {
        content: {
          screens: output.screens
        }
      })
    } else {
      emitter.emit('error', output.listen)
    }
  })
}
