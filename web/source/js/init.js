JAY.init = function () {
  'use strict'

  var body        = document.getElementsByTagName('body')[0],
      controller  = body.getAttribute('data-controller'),
      action      = body.getAttribute('data-action'),
      view        = body.getAttribute('data-view')

  JAY.global.init()

  if ( JAY[controller] ) {
    JAY[controller].init()

    if ( JAY[controller][action] && typeof JAY[controller][action] === 'function' ) {
      JAY[controller][action]()

      if ( JAY[controller][action][view] ) {
        JAY[controller][action][view]()
      }
    }
  }
}

document.onreadystatechange = function () {
  'use strict'

  if ( document.readyState === 'interactive' ) {
    JAY.init()
  }
}
