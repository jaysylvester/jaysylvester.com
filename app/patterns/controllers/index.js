// index controller

'use strict'

module.exports = {
  handler : handler
}


// default action
function handler() {
  return {
    include: {
      screens: {
        route: '/_screens/action/featured'
      }
    }
  }
}
