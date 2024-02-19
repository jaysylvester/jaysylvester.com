// case-study model


export const caseStudies = async () => {
  const client = await app.toolbox.dbPool.connect()

  try {
    const result = await client.query({
      name: 'case_studies_caseStudies',
      text: 'select id, company_name, company_url, title, tagline, vertical, platform, expertise, summary, sort ' +
            'from case_studies ' +
            'order by sort asc;'
    })
    // Transform the data to make it usable by the view
    let caseStudies = {}
    result.rows.forEach( function (item) {
      if ( !caseStudies[item.sort] ) {
        caseStudies[item.sort] = {
          company_url: item.company_url,
          company_name: item.company_name,
          title: item.title,
          summary: item.summary
        }
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
