// work-history controller

'use strict'

module.exports = {
  handler: handler
}


// default action
async function handler() {
  // let employers = await app.models['work-history'].employers()

  return {
    content: {
      employers: await app.models['work-history'].employers()
    }
  }
}
