// index controller

'use strict'

module.exports = {
  handler: handler
}


// default action
function handler(params, context, emitter) {
  app.listen({
    caseStudies: function (emitter) {
      app.models['case-studies'].caseStudies(emitter)
    }
  }, function (output) {
    if ( output.listen.success ) {
      emitter.emit('ready', {
        include: {
          header: {
            controller: '_header'
          },
          footer: {
            controller: '_footer'
          },
          caseStudies: {
            controller: 'case-studies',
            view: '_compact'
          }
        }
      })
    } else {
      emitter.emit('error', output.listen)
    }
  })
}
