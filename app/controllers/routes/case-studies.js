// _case-studies controller


// default action
export const handler = async () => {
  return {
    local: {
      caseStudies: await app.models['case-studies'].caseStudies()
    }
  }
}
