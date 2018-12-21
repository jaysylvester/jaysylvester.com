// _screens controller

'use strict'

module.exports = {
  handler: handler
}


// default action
async function handler(params) {
  return {
    content: {
      screens: params.url.company ? await app.models.screens.companyScreens(params.url.company) : await app.models.screens.screens()
    }
  }
}
