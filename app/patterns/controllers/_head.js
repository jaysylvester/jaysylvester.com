// _head controller


// default action
export const handler = async (params) => {
  let metaData = {},
      // Convert the controller name to a valid method name that matches the _head model method name
      modelMethod = params.route.controller.replace(/[-]([a-z])/g, (match, p1) => { return p1.toUpperCase() })

  if ( app.models._head[modelMethod] ) {
    metaData = await app.models._head[modelMethod](params.url['case-study'])
  } else {
    metaData = {
      title: 'Error',
      description: 'This request generated an error.',
      keywords: ''
    }
  }
  return {
    public: {
      metaData: metaData,
      tracking: app.config.citizen.mode === 'production' ? true : false
    }
  }
}
