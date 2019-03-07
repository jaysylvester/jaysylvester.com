window.app = {}

app.immediate = ( function () {
  'use strict'

  var methods = {
    init: function () {
      document.querySelector('html').classList.add('js')
    }
  }

  //  Public methods
  return {
    init: methods.init
  }

})(app)

app.immediate.init()
