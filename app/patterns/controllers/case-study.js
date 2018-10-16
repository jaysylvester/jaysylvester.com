// _case-study controller

'use strict'

module.exports = {
  handler: handler
}


// default action
function handler(params, context, emitter) {
  app.listen({
    caseStudy: function (emitter) {
      app.models['case-studies'].caseStudy(params.url.client, emitter)
    },
    screens: function (emitter) {
      app.models['case-studies'].screens(params.url.client, emitter)
    }
  }, function (output) {
    if ( output.caseStudy ) {
      output.caseStudy.screens = output.screens
      emitter.emit('ready', {
        content: output.caseStudy,
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
