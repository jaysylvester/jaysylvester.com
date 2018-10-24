// _case-study model

'use strict'

module.exports = {
  caseStudies: caseStudies,
  caseStudy: caseStudy
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