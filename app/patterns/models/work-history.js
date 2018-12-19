// work-history model

'use strict'

module.exports = {
  employers : employers
}


async function employers() {
  // See if the data already cached
  let cacheKey  = 'employers',
      scope     = 'work-history',
      cached    = app.cache.get({ scope: scope, key: cacheKey })

  // If it's cached, return the cache object
  if ( cached ) {
    return cached
  // If it's not cached, retrieve it from the database and cache it
  } else {
    const client = await app.toolbox.dbPool.connect()

    try {
      const result = await client.query({
        name: 'work_history_employers',
        text: 'select w.id, w.employer_name, w.employer_url, w.job_title, w.job_description, w.employed_from, w.employed_to, c.company_url from work_history w left join case_studies c on w.employer_url = c.company_url order by employed_to desc;'
      })
      // Format dates
      result.rows.forEach( function (item) {
        item.employed_from_formatted = app.toolbox.moment(item.employed_from).format('MMMM YYYY')
        item.employed_to_formatted = app.toolbox.moment(item.employed_to).format('MMMM YYYY')
      })
      // Cache the data for future requests
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
