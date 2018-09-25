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
    }
  }, function (output) {
    if ( output.caseStudy ) {
      emitter.emit('ready', {
        content: output.caseStudy,
        include: {
          header: {
            controller: '_header'
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
