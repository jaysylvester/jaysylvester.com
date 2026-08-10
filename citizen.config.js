export default {
  cors: {
    'Access-Control-Allow-Origin': process.env.CORS_ALLOW_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  },
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
}
