// _case-study controller

'use strict'

module.exports = {
  handler: handler
}


// default action
function handler(params, context, emitter) {
  app.listen({
    caseStudy: function (emitter) {
      app.models['case-studies'].caseStudy(params.url.company, emitter)
    }
  }, function (output) {
    if ( output.listen.success ) {
      if ( output.caseStudy ) {
        emitter.emit('ready', {
          content: output.caseStudy,
          include: {
            header: {
              controller: '_header'
            },
            footer: {
              controller: '_footer'
            },
            screens: {
              route: '/_screens/company/' + params.url.company
            }
          }
        })
      } else {
        emitter.emit('error', { statusCode: 404 })
      }
    } else {
      emitter.emit('error', output.listen)
    }
  })
}
