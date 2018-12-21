// _case-studies controller

'use strict'

module.exports = {
  handler : handler
}


// default action
async function handler(params) {
  return {
    content: {
      caseStudies: await app.models['case-studies'].caseStudies(params.url.count)
    }
  }
}
