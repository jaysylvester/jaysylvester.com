app.init = function () {
  'use strict'

  var body        = document.body,
      controller  = body.getAttribute('data-controller'),
      action      = body.getAttribute('data-action'),
      view        = body.getAttribute('data-view')

  app.global.init()

  if ( app[controller] ) {
    app[controller].init()

    if ( app[controller][action] && typeof app[controller][action] === 'function' ) {
      app[controller][action]()

      if ( app[controller][action][view] ) {
        app[controller][action][view]()
      }
    }
  }
}

document.onreadystatechange = function () {
  'use strict'

  if ( document.readyState === 'interactive' ) {
    app.init()
  }
}
