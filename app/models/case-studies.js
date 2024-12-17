// case-study model


export const caseStudies = async () => {
  const client = await app.toolbox.dbPool.connect()

  try {
    const result = await client.query({
      name: 'case_studies_caseStudies',
      text: 'select cs.id, cs.company_name, cs.company_url, cs.title, cs.summary, cs.sort, s.url, s.alt, s.sort as screen_sort ' +
            'from case_studies cs ' +
            'join screens s on cs.company_url = s.company ' +
            'where s.featured = true ' +
            'order by cs.sort asc, s.sort asc;'
    })
    
    // Transform the data to make it usable by the view
    let caseStudies = {}
    result.rows.forEach( function (item) {
      if ( !caseStudies[item.sort] ) {
        caseStudies[item.sort] = {
          company_name: item.company_name,
          company_url:  item.company_url,
          title:        item.title,
          screens:      {},
          summary:      item.summary
        }
      }

      caseStudies[item.sort].screens[item.screen_sort] = {
        url: item.url,
        alt: item.alt
      }
    })
    
    return caseStudies
  } finally {
    client.release()
  }
}


export const caseStudy = async (company) => {
  const client = await app.toolbox.dbPool.connect()

  try {
    const result = await client.query({
      name: 'case_studies_caseStudy',
      text: 'select id, company_name, company_url, title, tagline, vertical, platform, expertise, summary, content, sort ' +
            'from case_studies ' +
            'where company_url = $1 ' +
            'order by sort asc;',
      values: [ company ]
    })

    return result.rows[0]
  } finally {
    client.release()
  }
}
