// _rail controller


export const handler = async () => {
  return {
    local: {
      caseStudies: await app.models['case-studies'].caseStudies()
    }
  }
}
