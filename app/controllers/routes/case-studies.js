// _case-studies controller


// default action
export const handler = async (params) => {
  return {
    local: {
      caseStudies: await app.models['case-studies'].caseStudies(params.url.count)
    }
  }
}
