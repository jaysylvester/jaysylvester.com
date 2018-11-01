// _head controller

'use strict'

module.exports = {
  handler: handler
}

// default action
function handler(params, context, emitter) {
  app.listen({
    metaData: function (emitter) {
      switch ( params.route.controller ) {
        case 'case-study':
          app.models._head['case-study'](params.url.company, emitter)
          break
        default:
          app.models._head[params.route.controller](emitter)
      }
    }
  }, function (output) {
    if ( output.listen.success ) {
      if ( app.config.citizen.mode === 'production' ) {
        output.tracking = true
      }
      emitter.emit('ready', {
        content: output
      })
    } else {
      emitter.emit('error', output.listen)
    }
  })
}
