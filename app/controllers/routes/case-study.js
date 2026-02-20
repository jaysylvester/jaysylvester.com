// case-study controller


// default action
export const handler = async (params) => {
  let currentCompany = params.url.company || params.url['case-study']
  let caseStudy = await app.models['case-studies'].caseStudy(currentCompany)

  if ( caseStudy ) {
    // Get all case studies to find the next one for the callout
    const allCaseStudies = await app.models['case-studies'].caseStudies()
    const caseStudiesArray = Object.values(allCaseStudies)

    // Find current index and calculate next with wraparound
    const currentIndex = caseStudiesArray.findIndex(cs => cs.company_url === currentCompany)
    const nextIndex = (currentIndex + 1) % caseStudiesArray.length

    return {
      local: {
        ...caseStudy,
        callout: caseStudiesArray[nextIndex]
      },
      include: {
        featuredScreens: '/_screens/featured/true',
        screens: '/_screens'
      }
    }
  } else {
    let err = new Error('The case study you requested doesn\'t exist.<br><br>Feel free to browse <a href="/case-studies">my complete list of case studies</a>.')
    err.statusCode = 404
    throw err
  }
}
