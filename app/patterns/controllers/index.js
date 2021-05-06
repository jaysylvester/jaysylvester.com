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
        controller: '_screens',
        action: 'featured'
      }
    }
  }
}
