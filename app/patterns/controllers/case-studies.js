// _case-studies controller

'use strict'

module.exports = {
  handler: handler
}


// default action
function handler(params, context, emitter) {
  app.listen({
    caseStudies: function (emitter) {
      app.models['case-studies'].caseStudies(params.url.count, emitter)
    }
  }, function (output) {
    if ( output.listen.success ) {
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
      emitter.emit('error', output.listen)
    }
  })
}
