// _head controller

'use strict'

module.exports = {
  handler: handler
}

// default action
async function handler(params) {
  let metaData

  switch ( params.route.controller ) {
    case 'case-study':
      metaData = await app.models._head['case-study'](params.url.company)
      break
    default:
      metaData = await app.models._head[params.route.controller]()
  }
  
  return {
    content: {
      metaData: metaData,
      tracking: app.config.citizen.mode === 'production' ? true : false
    }
  }
}
