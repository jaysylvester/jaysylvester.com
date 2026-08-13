window.JAY = {}

JAY.immediate = ( function () {
  'use strict'

  const methods = {

    // Mark the document as JavaScript-enabled before the page renders so CSS can progressively enhance the interface.
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
