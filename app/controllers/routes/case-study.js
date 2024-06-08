// case-study controller


// default action
export const handler = async (params) => {
  let caseStudy = await app.models['case-studies'].caseStudy(params.url.company || params.url['case-study'])

  if ( caseStudy ) {
    return {
      local: caseStudy,
      include: {
        screens: {
          controller: '_screens'
        }
      }
    }
  } else {
    let err = new Error('The case study you requested doesn\'t exist.<br><br>Feel free to browse <a href="/case-studies">my complete list of case studies</a>.')
    err.statusCode = 404
    throw err
  }
}
