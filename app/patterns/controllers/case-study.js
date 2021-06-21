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
      public: caseStudy,
      include: {
        screens: {
          controller: '_screens'
        }
      }
    }
  } else {
    let err = new Error('The case study you requested doesn\'t exist.<br><br>Feel free to browse <a href="/case-studies">my complete list of case studies</a>.')
    err.statusCode = 404
    throw err
  }
}
