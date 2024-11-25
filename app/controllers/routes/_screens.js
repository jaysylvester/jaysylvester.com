// _screens controller


// default action
export const handler = async (params) => {
  return {
    local: {
      screens: params.url.company || params.url['case-study'] ? await app.models.screens.companyScreens(params.url.company || params.url['case-study'], params.url.featured) : await app.models.screens.screens()
    }
  }
}


export const featured = async () => {
  return {
    view: '_group',
    local: {
      screens: await app.models.screens.featuredScreens()
    }
  }
}
