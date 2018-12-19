// _case-study controller

'use strict'

module.exports = {
  handler: handler
}


// default action
async function handler(params) {
  let caseStudy = await app.models['case-studies'].caseStudy(params.url.company)

  if ( caseStudy ) {
    return {
      content: caseStudy,
      include: {
        screens: {
          route: '/_screens/company/' + params.url.company
        }
      }
    }
  } else {
    return {
      error: { statusCode: 404 }
    }
  }
}
