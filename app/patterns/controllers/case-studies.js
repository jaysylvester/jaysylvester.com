// _case-studies controller

'use strict'

module.exports = {
  handler : handler
}


// default action
async function handler(params) {
  return {
    public: {
      caseStudies: await app.models['case-studies'].caseStudies(params.url.count)
    }
  }
}
