// _case-study model

'use strict'

module.exports = {
  caseStudies : caseStudies,
  caseStudy   : caseStudy
}


async function caseStudies() {
  const client = await app.toolbox.dbPool.connect()

  try {
    const result = await client.query({
      name: 'case_studies_caseStudies',
      text: 'select cs.id, cs.company_name, cs.company_url, cs.title, cs.tagline, cs.vertical, cs.platform, cs.expertise, cs.summary, cs.sort, ' +
            's.url as screen_url, s.alt, s.sort as screen_sort ' +
            'from case_studies cs ' +
            'join screens s on cs.company_url = s.company ' +
            'order by s.sort asc, cs.sort asc;'
    })
    // Transform the data to make it usable by the view
    let caseStudies = {}
    result.rows.forEach( function (item) {
      if ( !caseStudies[item.sort] ) {
        caseStudies[item.sort] = {
          company_url: item.company_url,
          company_name: item.company_name,
          summary: item.summary,
          screens: {}
        }
      }
      // Limit to 4 screens per case study
      if ( Object.keys(caseStudies[item.sort].screens).length < 4 ) {
        caseStudies[item.sort].screens[item.screen_sort] = {
          url: item.screen_url,
          alt: item.alt
        }
      }
    })
    return caseStudies
  } finally {
    client.release()
  }
}


async function caseStudy(company) {
  const client = await app.toolbox.dbPool.connect()

  try {
    const result = await client.query({
      name: 'case_studies_caseStudy',
      text: 'select cs.id, cs.company_name, cs.company_url, cs.title, cs.tagline, cs.vertical, cs.platform, cs.expertise, cs.summary, cs.content, cs.sort, ' +
            's.url as screen_url, s.alt, s.sort as screen_sort ' +
            'from case_studies cs ' +
            'join screens s on cs.company_url = s.company ' +
            'where cs.company_url = $1 and s.featured = true ' +
            'order by s.sort asc, cs.sort asc;',
      values: [ company ]
    })
    // Transform the data to make it usable by the view
    let caseStudy = result.rows[0]
    caseStudy.screens = {}
    result.rows.forEach( function (item) {
      caseStudy.screens[item.screen_sort] = {
        url: item.screen_url,
        alt: item.alt
      }
    })
    return caseStudy
  } finally {
    client.release()
  }
}
