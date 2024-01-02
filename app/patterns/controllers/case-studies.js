// _case-studies controller


// default action
export const handler = async (params) => {
  return {
    public: {
      caseStudies: await app.models['case-studies'].caseStudies(params.url.count)
    }
  }
}
