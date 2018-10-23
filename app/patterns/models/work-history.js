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
    emitter.emit('ready', cached)
  // If it's not cached, retrieve it from the database and cache it
  } else {
    app.toolbox.dbPool.connect(function (err, client, done) {
      if ( err ) {
        emitter.emit('error', err)
      } else {
        client.query({
          name: 'employers',
          text: 'select w.id, w.employer_name, w.employer_url, w.job_title, w.job_description, w.employed_from, w.employed_to, c.client_url from work_history w left join case_studies c on w.employer_url = c.client_url order by employed_to desc;'
        },
          function (err, result) {
            done()
            if ( err ) {
              emitter.emit('error', err)
            } else {
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
              emitter.emit('ready', result.rows)
            }
          }
        )
      }
    })
  }
}
