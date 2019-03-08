SLC.init = function () {
  'use strict'

  var body        = document.body,
      controller  = body.getAttribute('data-controller'),
      action      = body.getAttribute('data-action'),
      view        = body.getAttribute('data-view')

  SLC.global.init()

  if ( SLC[controller] ) {
    SLC[controller].init()

    if ( SLC[controller][action] && typeof SLC[controller][action] === 'function' ) {
      SLC[controller][action]()

      if ( SLC[controller][action][view] ) {
        SLC[controller][action][view]()
      }
    }
  }
}

document.onreadystatechange = function () {
  'use strict'

  if ( document.readyState === 'interactive' ) {
    SLC.init()
  }
}
