// index controller


// default action
export const handler = async () => {
  const caseStudies = await app.models['case-studies'].caseStudies()

  return {
    local: {
      callout: Object.values(caseStudies).find(cs => cs.company_url === 'Rockerbox')
    }
  }
}
