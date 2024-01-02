// app start

// node
import fs           from 'fs'
import path         from 'path'
// local
import * as helpers from './toolbox/helpers.js'
// third party
import citizen      from 'citizen'
import consolidate  from 'consolidate'
import handlebars   from 'handlebars'
import moment       from 'moment'
import pg           from 'pg'

global.app = citizen

// Register Handlebars partials
consolidate.requires.handlebars = handlebars
consolidate.requires.handlebars.registerPartial('caseStudyCallout', fs.readFileSync(app.views['case-study']._callout.path).toString())
consolidate.requires.handlebars.registerPartial('screenGroup', fs.readFileSync(app.views._screens._group.path).toString())

// Get static file last modified times to populate cache buster variables
let cacheBuster = {
  css: fs.statSync(path.resolve(app.config.citizen.directories.app, '../web/min/site.css')).mtime.toString().replace(/[ :\-()]/g, ''),
  js:  fs.statSync(path.resolve(app.config.citizen.directories.app, '../web/min/site.js')).mtime.toString().replace(/[ :\-()]/g, '')
}

app.toolbox = {
  helpers: helpers,
  // Third party modules
  mail: {
    sendMail: function (args) {
      app.helpers.log({
        label: 'E-mail debug log (not sent)',
        content: {
          from: args.from,
          to: args.to,
          subject: args.subject,
          text: args.text
        },
        toFile: true,
        file: 'email.log'
      })
    }
  },
  moment: moment,
  pg:     pg
}

// Overwrite pg's default date handler to convert to GMT
app.toolbox.pg.types.setTypeParser(1114, function (stringValue) {
  return new Date(Date.parse(stringValue + ' +0000')).toISOString()
})
// Create a connection pool
app.toolbox.dbPool = new app.toolbox.pg.Pool(app.config.db)
// Log errors in the connection pool
app.toolbox.dbPool.on('error', function (err) {
  app.helpers.log({
    type: 'error',
    label: 'Database pool error',
    contents: err
  })
})

app.server.start({
  cacheBuster: cacheBuster
})
