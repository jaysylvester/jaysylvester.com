// _screens model

'use strict'

module.exports = {
  companyScreens  : companyScreens,
  screens         : screens
}


async function companyScreens(company) {
  // See if these screens are already cached
  let cacheKey  = 'screens-' + company,
      scope     = 'screens',
      cached    = app.cache.get({ scope: scope, key: cacheKey })
  
  // If it's cached, return the cache object
  if ( cached ) {
    return cached
  // If it's not cached, retrieve it from the database and cache it
  } else {
    const client = await app.toolbox.dbPool.connect()

    try {
      const result = await client.query({
        name: 'case_study_screens',
        text: 'select id, company, url, alt, category, sort from screens where company = $1 order by sort asc;',
        values: [ company ]
      })
      // Transform the data to make it usable by the view
      let screens = {}
      result.rows.forEach( function (screen) {
        if ( !screens[screen.category] ) {
          screens[screen.category] = {
            company: screen.company,
            category: screen.category,
            screens: {}
          }
        }
        screens[screen.category].screens[screen.id] = {
          company:  screen.company,
          url:      screen.url,
          alt:      screen.alt,
          sort:     screen.sort,
          category: screen.category
        }
      })
      // Cache the case study for future requests
      if ( !app.cache.exists({ scope: scope, key: cacheKey }) ) {
        app.cache.set({
          key: cacheKey,
          scope: scope,
          value: screens
        })
      }
      return screens
    } finally {
      client.release()
    }
  }
}


async function screens() {
  // See if these screens are already cached
  let cacheKey  = 'all-screens',
      scope     = 'screens',
      cached    = app.cache.get({ scope: scope, key: cacheKey })
  
  // If it's cached, return the cache object
  if ( cached ) {
    return cached
  // If it's not cached, retrieve it from the database and cache it
  } else {
    const client = await app.toolbox.dbPool.connect()

    try {
      const result = await client.query({
        name: 'portfolio_screens',
        text: 'select id, company, url, alt, category, sort from screens order by sort asc;'
      })
      // Transform the data to make it usable by the view
      let screens = {}
      result.rows.forEach( function (screen) {
        if ( !screens[screen.category] ) {
          screens[screen.category] = {
            company: screen.company,
            category: screen.category,
            screens: {}
          }
        }
        screens[screen.category].screens[screen.id] = {
          company:  screen.company,
          url:      screen.url,
          alt:      screen.alt,
          sort:     screen.sort,
          category: screen.category
        }
      })
      // Cache the case study for future requests
      if ( !app.cache.exists({ scope: scope, key: cacheKey }) ) {
        app.cache.set({
          key: cacheKey,
          scope: scope,
          value: screens
        })
      }
      return screens
    } finally {
      client.release()
    }
  }
}
