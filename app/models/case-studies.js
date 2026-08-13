// case-study model


export const caseStudies = async () => {
  const cacheKey = 'case-studies',
        cacheScope = 'models',
        cached = app.cache.get({ scope: cacheScope, key: cacheKey })

  if ( cached ) return cached

  const client = await app.toolbox.dbPool.connect()

  try {
    const result = await client.query({
      name: 'case_studies_caseStudies_v2',
      text: 'select cs.id, cs.company_name, cs.company_url, cs.title, cs.tagline, cs.vertical, cs.platform, cs.expertise, cs.summary, cs.sort, cs.featured, ' +
            's.id as screen_id, s.url, s.alt, s.sort as screen_sort ' +
            'from case_studies cs ' +
            'left join screens s on cs.company_url = s.company and s.featured = true ' +
            'order by cs.sort asc, s.sort asc;'
    })

    const caseStudies = [],
          byId = new Map()

    result.rows.forEach((row) => {
      if ( !byId.has(row.id) ) {
        const caseStudy = {
          id:               row.id,
          company_name:     row.company_name,
          company_url:      row.company_url,
          title:            row.title,
          tagline:          row.tagline,
          vertical:         row.vertical,
          platform:         row.platform,
          expertise:        row.expertise,
          expertise_items:  row.expertise ? row.expertise.split(' / ') : [],
          summary:          row.summary,
          sort:             row.sort,
          featured:         row.featured,
          screens:          []
        }

        byId.set(row.id, caseStudy)
        caseStudies.push(caseStudy)
      }

      if ( row.screen_id ) {
        byId.get(row.id).screens.push({
          id:   row.screen_id,
          url:  row.url,
          alt:  row.alt,
          sort: row.screen_sort
        })
      }
    })

    caseStudies.forEach((caseStudy) => {
      caseStudy.hero = caseStudy.screens[0]
    })

    if ( !app.cache.exists({ scope: cacheScope, key: cacheKey }) ) {
      app.cache.set({
        key: cacheKey,
        scope: cacheScope,
        value: caseStudies,
        lifespan: 'application'
      })
    }

    return caseStudies
  } finally {
    client.release()
  }
}


export const caseStudy = async (company) => {
  const cacheKey = 'case-study-' + company,
        cacheScope = 'models',
        cached = app.cache.get({ scope: cacheScope, key: cacheKey })

  if ( cached ) return cached

  const client = await app.toolbox.dbPool.connect()

  try {
    const result = await client.query({
      name: 'case_studies_caseStudy_v2',
      text: 'select id, company_name, company_url, title, tagline, vertical, platform, expertise, summary, content, sort, featured ' +
            'from case_studies ' +
            'where company_url = $1 ' +
            'order by sort asc;',
      values: [ company ]
    })

    const caseStudy = result.rows[0]

    if ( caseStudy ) {
      caseStudy.expertise_items = caseStudy.expertise ? caseStudy.expertise.split(' / ') : []

      if ( !app.cache.exists({ scope: cacheScope, key: cacheKey }) ) {
        app.cache.set({
          key: cacheKey,
          scope: cacheScope,
          value: caseStudy,
          lifespan: 'application'
        })
      }
    }

    return caseStudy
  } finally {
    client.release()
  }
}
