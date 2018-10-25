// _screens model

'use strict'

module.exports = {
  companyScreens: companyScreens,
  screens: screens
}


function companyScreens(company, emitter) {
  // See if these screens are already cached
  var cacheKey  = 'screens-' + company,
      scope     = 'screens',
      cached    = app.cache.get({ scope: scope, key: cacheKey })

  // If cached, return the cache object
  if ( cached ) {
    emitter.emit('ready', cached)
  // If not cached, retrieve them from the database and cache them
  } else {
    app.toolbox.dbPool.connect(function (err, client, done) {
      if ( err ) {
        emitter.emit('error', err)
      } else {
        client.query({
          name: 'case_study_screens',
          text: 'select id, company, url, alt, category, sort from screens where company = $1 order by sort asc;',
          values: [ company ]
        },
          function (err, result) {
            done()
            if ( err ) {
              emitter.emit('error', err)
            } else {
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

              // Cache these screens for future requests
              if ( !app.cache.exists({ scope: scope, key: cacheKey }) ) {
                app.cache.set({
                  key: cacheKey,
                  scope: scope,
                  value: screens
                })
              }
              
              emitter.emit('ready', screens)
            }
          }
        )
      }
    })
  }
}


function screens(emitter) {
  // See if these screens are already cached
  var cacheKey  = 'all-screens',
      scope     = 'screens',
      cached    = app.cache.get({ scope: scope, key: cacheKey })

  // If cached, return the cache object
  if ( cached ) {
    emitter.emit('ready', cached)
  // If not cached, retrieve them from the database and cache them
  } else {
    app.toolbox.dbPool.connect(function (err, client, done) {
      if ( err ) {
        emitter.emit('error', err)
      } else {
        client.query({
          name: 'portfolio_screens',
          text: 'select id, company, url, alt, category, sort from screens order by sort asc;'
        },
          function (err, result) {
            done()
            if ( err ) {
              emitter.emit('error', err)
            } else {
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

              // Cache these screens for future requests
              if ( !app.cache.exists({ scope: scope, key: cacheKey }) ) {
                app.cache.set({
                  key: cacheKey,
                  scope: scope,
                  value: screens
                })
              }
              emitter.emit('ready', screens)
            }
          }
        )
      }
    })
  }
}