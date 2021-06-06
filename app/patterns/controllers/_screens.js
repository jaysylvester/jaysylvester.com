// _screens controller

'use strict'

module.exports = {
  handler  : handler,
  featured : featured
}


// default action
async function handler(params) {
  return {
    public: {
      screens: params.url.company ? await app.models.screens.companyScreens(params.url.company) : await app.models.screens.screens()
    }
  }
}


async function featured() {
  return {
    view: '_group',
    public: {
      screens: await app.models.screens.featuredScreens()
    }
  }
}
