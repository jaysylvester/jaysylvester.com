// _case-studies controller

'use strict'

module.exports = {
  handler: handler
}


// default action
function handler(params, context, emitter) {
  app.listen({
    caseStudies: function (emitter) {
      app.models.clients.caseStudies(emitter)
    }
  }, function (output) {
    if ( output.caseStudies ) {
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
    } else {
      emitter.emit('error', {
        statusCode: 404
      })
    }
  })
}
