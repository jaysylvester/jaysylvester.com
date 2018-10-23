// _case-study model

'use strict'

module.exports = {
  caseStudies: caseStudies,
  caseStudy: caseStudy,
  screens: screens
}


function caseStudies(emitter) {
  // See if the case study is already cached
  var cacheKey  = 'case-studies',
      scope     = 'case-studies',
      cached    = app.cache.get({ scope: scope, key: cacheKey })

  // If it's cached, return the cache object
  if ( cached ) {
    emitter.emit('ready', cached)
  // If it's not cached, retrieve it from the database and cache it
  } else {
    app.toolbox.dbPool.connect(function (err, client, done) {
      if ( err ) {
        emitter.emit('error', err)
      } else {
        client.query({
          name: 'case_studies',
          text: 'select id, client_name, client_url, title, tagline, vertical, platform, expertise, summary, sort from case_studies order by sort asc;'
        },
          function (err, result) {
            done()
            if ( err ) {
              emitter.emit('error', err)
            } else {
              // Cache the case study for future requests
              if ( !app.cache.exists({ scope: scope, key: cacheKey }) ) {
                app.cache.set({
                  key: cacheKey,
                  scope: scope,
                  value: result.rows
                })
              }
              emitter.emit('ready', result.rows)
            }
          }
        )
      }
    })
  }
}


function caseStudy(clientUrl, emitter) {
  // See if the case study is already cached
  var cacheKey  = 'case-study-' + clientUrl,
      scope     = 'case-studies',
      cached    = app.cache.get({ scope: scope, key: cacheKey })

  // If it's cached, return the cache object
  if ( cached ) {
    emitter.emit('ready', cached)
  // If it's not cached, retrieve it from the database and cache it
  } else {
    app.toolbox.dbPool.connect(function (err, client, done) {
      if ( err ) {
        emitter.emit('error', err)
      } else {
        client.query({
          name: 'case_study',
          text: 'select id, client_name, client_url, title, tagline, vertical, platform, expertise, summary, content from case_studies where client_url = $1;',
          values: [ clientUrl ]
        },
          function (err, result) {
            done()
            if ( err ) {
              emitter.emit('error', err)
            } else {
              // Cache the case study for future requests
              if ( !app.cache.exists({ scope: scope, key: cacheKey }) ) {
                app.cache.set({
                  key: cacheKey,
                  scope: scope,
                  value: result.rows[0]
                })
              }
              emitter.emit('ready', result.rows[0])
            }
          }
        )
      }
    })
  }
}


function screens(clientUrl, emitter) {
  // See if these screens are already cached
  var cacheKey  = 'case-study-screens-' + clientUrl,
      scope     = 'case-studies',
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
          text: 'select id, client, url, alt, category, sort from screens where client = $1;',
          values: [ clientUrl ]
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
                    category: screen.category,
                    screens: {}
                  }
                }
                screens[screen.category].screens[screen.id] = {
                  client:   screen.client,
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
