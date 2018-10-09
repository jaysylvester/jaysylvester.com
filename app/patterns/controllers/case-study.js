// _case-study controller

'use strict'

module.exports = {
  handler: handler
}


// default action
function handler(params, context, emitter) {
  app.listen({
    caseStudy: function (emitter) {
      app.models['case-study'].content(params.url.client, emitter)
    },
    screens: function (emitter) {
      app.models['case-study'].screens(params.url.client, emitter)
    }
  }, function (output) {
    if ( output.caseStudy ) {
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
