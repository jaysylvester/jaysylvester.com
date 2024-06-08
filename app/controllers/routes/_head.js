// _head controller


// default action
export const handler = async ({ url }) => {
  let metaData = {},
      // Convert the controller name to a valid method name that matches the _head model method name
      modelMethod = url.controller.replace(/[-]([a-z])/g, (match, p1) => { return p1.toUpperCase() })

  if ( app.models._head[modelMethod] ) {
    metaData = await app.models._head[modelMethod](url['case-study'])
  } else {
    metaData = {
      title: 'Error',
      description: 'This request generated an error.',
      keywords: ''
    }
  }
  return {
    local: {
      metaData: metaData,
      tracking: app.config.citizen.mode === 'production' ? true : false
    }
  }
}
