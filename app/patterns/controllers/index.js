// index controller

'use strict'

module.exports = {
  handler: handler
}


// default action
function handler(params, context, emitter) {
  emitter.emit('ready', {
    include: {
      header: {
        controller: '_header'
      },
      footer: {
        controller: '_footer'
      },
      caseStudy: {
        route: '/case-study/client/Vidyo',
        view: '_callout'
      }
    }
  })
}
