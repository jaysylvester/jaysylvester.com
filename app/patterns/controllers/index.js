// index controller

'use strict'

module.exports = {
  handler: handler
}


// default action
function handler(params, context, emitter) {
  emitter.emit('ready', {
    include: {
      caseStudy: {
        route: '/case-study/client/Vidyo',
        view: 'callout'
      }
    }
  })
}
