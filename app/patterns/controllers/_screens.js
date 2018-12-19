// _screens controller

'use strict'

module.exports = {
  handler: handler
}


// default action
async function handler(params) {
  let screens = params.url.company ? await app.models.screens.companyScreens(params.url.company) : await app.models.screens.screens()

  return {
    content: {
      screens: screens
    }
  }
}
