// _case-study model

'use strict'

module.exports = {
  caseStudies : caseStudies,
  caseStudy   : caseStudy
}


async function caseStudies(count = false) {
  // See if the case study is already cached
  let cacheKey  = 'case-studies-' + count,
      scope     = 'case-studies',
      cached    = app.cache.get({ scope: scope, key: cacheKey })

  // If it's cached, return the cache object
  if ( cached ) {
    return cached
  // If it's not cached, retrieve it from the database and cache it
  } else {
    const client = await app.toolbox.dbPool.connect()

    try {
      const result = await client.query({
        name: count ? 'case_studies_caseStudies_count_' + count : 'case_studies_caseStudies',
        text: 'select id, company_name, company_url, title, tagline, vertical, platform, expertise, summary, sort from case_studies order by sort asc' + ( count ? ' limit ' + count : '' ) + ';'
      })
      // Cache the case study for future requests
      if ( !app.cache.exists({ scope: scope, key: cacheKey }) ) {
        app.cache.set({
          key: cacheKey,
          scope: scope,
          value: result.rows
        })
      }
      return result.rows
    } finally {
      client.release()
    }
  }
}


async function caseStudy(companyUrl) {
  // See if the case study is already cached
  let cacheKey  = 'case-study-' + companyUrl,
      scope     = 'case-studies',
      cached    = app.cache.get({ scope: scope, key: cacheKey })

  // If it's cached, return the cache object
  if ( cached ) {
    return cached
  // If it's not cached, retrieve it from the database and cache it
  } else {
    const client = await app.toolbox.dbPool.connect()

    try {
      const result = await client.query({
        name: 'case_studies_caseStudy',
        text: 'select id, company_name, company_url, title, tagline, vertical, platform, expertise, summary, content from case_studies where company_url = $1;',
        values: [ companyUrl ]
      })
      // Cache the case study for future requests
      if ( !app.cache.exists({ scope: scope, key: cacheKey }) ) {
        app.cache.set({
          key: cacheKey,
          scope: scope,
          value: result.rows[0]
        })
      }
      return result.rows[0]
    } finally {
      client.release()
    }
  }
}
