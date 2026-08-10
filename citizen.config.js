import { requiredEnvironment } from './app/helpers/utility.js'

export default {
  cors: {
    'Access-Control-Allow-Origin': requiredEnvironment('CORS_ALLOW_ORIGIN'),
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
  layout: {
    controller: '_layout'
  },
  templateEngine: 'handlebars'
}
