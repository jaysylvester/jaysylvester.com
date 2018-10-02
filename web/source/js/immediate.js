window.JAY = {}

JAY.immediate = ( function () {
  'use strict'

  var methods = {
    init: function () {
      document.querySelector('html').classList.add('js')
      methods.detectTouchDevice()
    },
    
    detectTouchDevice: function () {
      // https://stackoverflow.com/questions/4817029/whats-the-best-way-to-detect-a-touch-screen-device-using-javascript#4819886
      var prefixes = ' -webkit- -moz- -o- -ms- '.split(' ')
      var mq = function(query) {
        return window.matchMedia(query).matches
      }
    
      if (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch) {
        return true
      }
    
      // include the 'heartz' as a way to have a non matching MQ to help terminate the join
      // https://git.io/vznFH
      var query = ['(', prefixes.join('touch-enabled),('), 'heartz', ')'].join('')
      return mq(query)
    }
  }

  //  Public methods
  return {
    init: methods.init
  }

})(JAY)

JAY.immediate.init()
