// index controller

'use strict'

module.exports = {
  handler: handler
}


// default action
function handler(params, context, emitter) {
  emitter.emit('ready', {
    include: {
      caseStudies: {
        route: '/case-studies/count/3',
        view: '_compact'
      }
    }
  })
}
