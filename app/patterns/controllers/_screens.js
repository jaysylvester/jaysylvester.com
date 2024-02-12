// _screens controller


// default action
export const handler = async (params) => {
  return {
    public: {
      screens: params.url.company || params.url['case-study'] ? await app.models.screens.companyScreens(params.url.company || params.url['case-study']) : await app.models.screens.screens()
    }
  }
}


export const featured = async () => {
  return {
    view: '_group',
    public: {
      screens: await app.models.screens.featuredScreens()
    }
  }
}
