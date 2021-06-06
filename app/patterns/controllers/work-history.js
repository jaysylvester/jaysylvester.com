// work-history controller

'use strict'

module.exports = {
  handler: handler
}


// default action
async function handler() {
  return {
    public: {
      employers: await app.models['work-history'].employers()
    }
  }
}
