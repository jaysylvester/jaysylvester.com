export default {
  citizen: {
    development: {
      watcher: {
        interval: 500,
        usePolling: true
      }
    },
    http: {
      hostname: '',
      port: 8080
    },
    logs: {
      watcher: {
        interval: 60000,
        usePolling: process.env.NODE_ENV === 'development'
      }
    },
    layout: {
      controller: '_layout'
    },
    templateEngine: 'handlebars'
  },
  db: {
    host: 'db',
    port: 5432,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    max: 180,
    connectionTimeoutMillis: 10000
  },
  mail: {
    service: 'SendGrid',
    auth: {
      user: 'apikey'
    },
    name: 'Jay Sylvester',
    address: 'jay@jaysylvester.com',
    addressNoReply: 'noreply@jaysylvester.com'
  }
}
