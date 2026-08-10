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

const development = app.config.citizen.mode === 'development'

// Register Handlebars partials
consolidate.requires.handlebars = handlebars
consolidate.requires.handlebars.registerHelper('eq', (a, b) => a == b)
consolidate.requires.handlebars.registerPartial('caseStudyCallout', fs.readFileSync(app.views['case-study']._callout.path).toString())
consolidate.requires.handlebars.registerPartial('screenGroup', fs.readFileSync(app.views._screens._group.path).toString())

// Get static file last modified times to populate cache buster variables
const cacheBuster = {
  css: fs.statSync(path.resolve(app.config.citizen.directories.app, '../web/min/site.css')).mtime.toString().replace(/[ :\-()]/g, ''),
  js:  fs.statSync(path.resolve(app.config.citizen.directories.app, '../web/min/site.js')).mtime.toString().replace(/[ :\-()]/g, '')
}

let mail

if ( development ) {
  mail = {
    sendMail: function (args) {
      app.log({
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
  }
} else {
  mail = nodemailer.createTransport({
    service: app.config.mail.service,
    auth: {
      user: app.config.mail.auth.user,
      pass: fs.readFileSync(process.env.MAIL_AUTH_PASS_FILE, 'utf8').replace(/\r?\n$/, '')
    }
  })
}

app.toolbox = {
  // Third party modules
  mail:   mail,
  moment: moment,
  pg:     pg
}

// Overwrite pg's default date handler to convert to GMT
app.toolbox.pg.types.setTypeParser(1114, function (stringValue) {
  return new Date(Date.parse(stringValue + ' +0000')).toISOString()
})
// Create a connection pool
app.toolbox.dbPool = new app.toolbox.pg.Pool({
  ...app.config.db,
  password: development
    ? process.env.DB_PASSWORD
    : fs.readFileSync(process.env.DB_PASSWORD_FILE, 'utf8').replace(/\r?\n$/, '')
})
// Log errors in the connection pool
app.toolbox.dbPool.on('error', function (err) {
  app.log({
    type: 'error',
    label: 'Database pool error',
    content: err
  })
})

app.start({ cacheBuster })
