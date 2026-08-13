// case-study controller


// default action
export const handler = async (params) => {
  const company = params.url.company || params.url['case-study'],
        caseStudy = await app.models['case-studies'].caseStudy(company)

  if ( caseStudy ) {
    const [ allCaseStudies, screenSections ] = await Promise.all([
            app.models['case-studies'].caseStudies(),
            app.models.screens.companyScreens(company)
          ]),
          currentIndex = allCaseStudies.findIndex((item) => item.company_url === company),
          previousIndex = (currentIndex - 1 + allCaseStudies.length) % allCaseStudies.length,
          nextIndex = (currentIndex + 1) % allCaseStudies.length,
          featuredScreens = allCaseStudies[currentIndex].screens

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
