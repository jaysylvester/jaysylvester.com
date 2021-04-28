// _head controller

'use strict'

module.exports = {
  handler: handler
}

// default action
async function handler(params) {
  return {
    content: {
      metaData: await app.models._head.default[params.route.controller](params.url.company),
      tracking: app.config.citizen.mode === 'production' ? true : false
    }
  }
}
