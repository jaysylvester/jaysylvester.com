// app start

// node
import fs           from 'fs'
import path         from 'path'
// third party
import citizen      from 'citizen'
import consolidate  from '@ladjs/consolidate'
import handlebars   from 'handlebars'
import moment       from 'moment'
import nodemailer   from 'nodemailer'
import pg           from 'pg'

global.app = citizen

// Register Handlebars partials
consolidate.requires.handlebars = handlebars
consolidate.requires.handlebars.registerHelper('eq', (a, b) => a == b)
consolidate.requires.handlebars.registerPartial('caseStudyCallout', fs.readFileSync(app.views['case-study']._callout.path).toString())
consolidate.requires.handlebars.registerPartial('screenGroup', fs.readFileSync(app.views._screens._group.path).toString())

// Get static file last modified times to populate cache buster variables
let cacheBuster = {
  css: fs.statSync(path.resolve(app.config.directories.app, '../web/min/site.css')).mtime.toString().replace(/[ :\-()]/g, ''),
  js:  fs.statSync(path.resolve(app.config.directories.app, '../web/min/site.js')).mtime.toString().replace(/[ :\-()]/g, '')
}

app.toolbox = {
  // Third party modules
  cacheBuster: cacheBuster,
  mail: nodemailer.createTransport({
    service: app.helpers.utility.requiredEnvironment('MAIL_SERVICE'),
    auth: {
      user: app.helpers.utility.requiredEnvironment('MAIL_AUTH_USER'),
      pass: app.helpers.utility.requiredSecret('mail-auth-pass', 'MAIL_AUTH_PASS')
    }
  }),
  moment: moment,
  pg:     pg
}

// Overwrite pg's default date handler to convert to GMT
app.toolbox.pg.types.setTypeParser(1114, function (stringValue) {
  return new Date(Date.parse(stringValue + ' +0000')).toISOString()
})
// Create a connection pool
app.toolbox.dbPool = new app.toolbox.pg.Pool({
  host:                    app.helpers.utility.requiredEnvironment('DB_HOST'),
  port:                    Number(app.helpers.utility.requiredEnvironment('DB_PORT')),
  database:                app.helpers.utility.requiredEnvironment('DB_DATABASE'),
  user:                    app.helpers.utility.requiredEnvironment('DB_USER'),
  password:                app.helpers.utility.requiredSecret('db-password', 'DB_PASSWORD'),
  max:                     Number(app.helpers.utility.requiredEnvironment('DB_MAX')),
  connectionTimeoutMillis: Number(app.helpers.utility.requiredEnvironment('DB_CONNECTION_TIMEOUT_MILLIS'))
})
// Log errors in the connection pool
app.toolbox.dbPool.on('error', function (err) {
  app.log({
    type: 'error',
    label: 'Database pool error',
    contents: err
  })
})

app.start()
