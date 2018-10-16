// app start

'use strict'

global.app = require('citizen')

// Register Handlebars partials
const consolidate = require('consolidate'),
      handlebars  = require('handlebars'),
      fs          = require('fs')
consolidate.requires.handlebars = handlebars
consolidate.requires.handlebars.registerPartial('caseStudyCallout', fs.readFileSync(app.views['case-study']._callout.path).toString())

app.toolbox = {
  // Third party modules
  mail:   require('nodemailer').createTransport(app.config.mail),
  moment: require('moment'),
  pg:     require('pg')
}

// Overwrite pg's default date handler to convert to GMT
app.toolbox.pg.types.setTypeParser(1114, function (stringValue) {
  return new Date(Date.parse(stringValue + ' +0000')).toISOString()
})
// Create a connection pool
app.toolbox.dbPool = new app.toolbox.pg.Pool(app.config.db)
// Log errors in the connection pool
app.toolbox.dbPool.on('error', function (err) {
  app.log({
    type: 'error',
    label: 'Database pool error',
    contents: err
  })
})

app.start()
