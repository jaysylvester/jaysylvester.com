window.JAY = {}

JAY.immediate = ( function () {
  'use strict'

  const methods = {
    init: function () {
      document.querySelector('html').classList.add('js')
    }
  }

  //  Public methods
  return {
    init: methods.init
  }

})(JAY)

JAY.immediate.init()
