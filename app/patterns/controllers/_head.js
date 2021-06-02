// _head controller

'use strict'

module.exports = {
  handler: handler
}

// default action
async function handler(params) {
  let metaData = {}
  if ( app.models._head.default[params.route.controller] ) {
    metaData = await app.models._head.default[params.route.controller](params.url.company)
  } else {
    metaData = {
      title: 'Error',
      description: 'This request generated an error.',
      keywords: ''
    }
  }
  return {
    content: {
      metaData: metaData,
      tracking: app.config.citizen.mode === 'production' ? true : false
    }
  }
}
