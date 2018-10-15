// work-history model

'use strict'

module.exports = {
  employers: employers
}


function employers(emitter) {
  // See if the data already cached
  var cacheKey  = 'employers',
      scope     = 'work-history',
      cached    = app.cache.get({ scope: scope, key: cacheKey })

  // If it's cached, return the cache object
  if ( cached ) {
    return cached
  // If it's not cached, retrieve it from the database and cache it
  } else {
    app.toolbox.dbPool.connect(function (err, client, done) {
      if ( err ) {
        emitter.emit('error', err)
      } else {
        client.query({
          name: 'employers',
          text: 'select id, client_name, client_url, title, tagline, vertical, platform, expertise, summary, sort from case_studies order by sort asc;'
        },
          function (err, result) {
            done()
            if ( err ) {
              emitter.emit('error', err)
            } else {
              // Cache the data for future requests
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
