// case-study controller


// default action
export const handler = async (params) => {
  const currentCompany = params.url.company || params.url['case-study'],
        caseStudy = await app.models['case-studies'].caseStudy(currentCompany)

  if ( caseStudy ) {
    const allCaseStudies = await app.models['case-studies'].caseStudies(),
          currentIndex = allCaseStudies.findIndex((item) => item.company_url === currentCompany),
          previousIndex = (currentIndex - 1 + allCaseStudies.length) % allCaseStudies.length,
          nextIndex = (currentIndex + 1) % allCaseStudies.length,
          screenSections = await app.models.screens.companyScreens(currentCompany),
          featuredScreens = await app.models.screens.featuredScreens(currentCompany)

    return {
      local: {
        ...caseStudy,
        previous: allCaseStudies[previousIndex],
        next: allCaseStudies[nextIndex],
        featuredScreens: featuredScreens,
        screenSections: screenSections
      }
    }
  } else {
    const err = new Error('The case study you requested doesn\'t exist.<br><br>Feel free to browse <a href="/case-studies">my complete list of case studies</a>.')
    err.statusCode = 404
    throw err
  }
}
