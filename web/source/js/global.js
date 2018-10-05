JAY.global = ( function () {
  'use strict'

  var methods = {

    init: function () {
      methods.header()
      methods.imageLoad()
    },

    header: function () {
      var body = document.querySelector('body'),
          bodyOffset = 0,
          timer = 0,
          header = document.querySelector('body > header'),
          menuIcon

      setTimeout( function () {
        window.addEventListener('scroll', function () {
          if ( !body.classList.contains('hidden-header') && bodyOffset > body.getBoundingClientRect().top && Math.abs(body.getBoundingClientRect().top) > header.getBoundingClientRect().height ) {
            body.classList.add('hidden-header')
          // The minus 10 pixels is to keep the header from popping in with only slight movements (happens frequently when using touchscreens and touch input devices)
          // The second half of the statement deals with Safari's bounceback when you scroll past the top of the page
          } else if ( body.getBoundingClientRect().top - 10 >= bodyOffset || Math.abs(body.getBoundingClientRect().top) <= header.getBoundingClientRect().height ) {
            body.classList.remove('hidden-header')
          }

          bodyOffset = body.getBoundingClientRect().top
        })
      }, timer)
      
      // Create the main menu icon
      // menuIcon = document.createElement('div')

      // menuIcon.setAttribute('id', 'main-menu-icon')
      // menuIcon.innerHTML = '<svg class="icon menu"><use xlink:href="themes/default/images/symbols.svg#icon-menu"></use></svg>'
      // menuIcon.appendChild(document.createTextNode('Menu'))
      // header.insertBefore(menuIcon, header.querySelector('a.home'))

      // methods.menu({
      //   menu: 'header nav',
      //   trigger: '#main-menu-icon',
      //   position: 'left'
      // })
    },

    imageLoad: function () {
      var load = function () {
            const images = document.querySelectorAll('img:not(.loaded)')

            if ( images.length ) {
              images.forEach( function (item) {
                if ( item.dataset.src ) {
                  var dimension = item.clientWidth ? 'w_' + item.clientWidth : 'h_' + item.clientHeight
  
                  // If the image is within 1.5 screen heights of the current offset, load it
                  if ( item.getBoundingClientRect().top < ( document.body.clientHeight * 1.5 ) ) {
                    item.src = item.dataset.src.replace('[parameters]', 'f_auto,' + dimension + ',dpr_' + Math.ceil(window.devicePixelRatio) + '.0')
                    item.classList.add('loaded')
                    if ( item.parentNode.tagName === 'FIGURE' ) {
                      methods.imageZoom(item)
                    }
                  }
                } else {
                  item.classList.add('loaded')
                }
              })
            } else {
              window.removeEventListener('scroll', load)
            }
          }
      
      load()

      window.addEventListener('scroll', load)
    },

    imageZoom: function (item) {
      var mask = document.getElementById('mask') || document.createElement('div'),
          zoomWrapper = document.createElement('span'),
          zoomButton = document.createElement('span'),
          parent = item.parentNode,
          src = item.dataset.src.replace('[parameters]', 'f_auto,q_50,dpr_' + Math.ceil(window.devicePixelRatio) + '.0')

      mask.setAttribute('id', 'mask')
      document.body.appendChild(mask)
      zoomWrapper.classList.add('zoom')
      parent.insertBefore(zoomWrapper, parent.querySelector('figcaption'))
      zoomButton.classList.add('zoom-button')
      zoomWrapper.appendChild(item)
      zoomWrapper.appendChild(zoomButton)

      zoomWrapper.addEventListener('click', function () {
        mask.innerHTML = '<a id="mask-open-tab" href="' + src + '" target="_blank">Open this image in a new tab</a><a id="mask-close" href="#">Close</a><img src="' + src + '">'
        document.querySelector('html').classList.add('mask-enabled')
        mask.classList.add('enabled')

        window.addEventListener('keydown', escape)
        mask.querySelector('#mask-close').addEventListener('click', function (e) {
          e.preventDefault()
          close()
        })
        mask.querySelector('#mask-open-tab').addEventListener('click', function () {
          close()
        })

        function escape(e) {
          if ( e.key === 'Escape' ) {
            close()
          }
        }

        function close() {
          document.querySelector('html').classList.remove('mask-enabled')
          mask.classList.remove('enabled')
          mask.innerHTML = ''
          window.removeEventListener('keydown', escape)
        }
      })
    },

    menu: function (args) {
      var body = document.querySelector('body'),
          menu,
          trigger = document.querySelector(args.trigger)

      trigger.addEventListener('click', function () {
        var source = document.querySelector(args.menu),
            menuShadow = document.createElement('div')

        menu = source.cloneNode(true)
        body.appendChild(menu)
        menuShadow.className = 'menu-shadow'
        body.appendChild(menuShadow)

        if ( args.keepClass === false ) {
          menu.className = 'slide-menu ' + args.position
        } else {
          menu.className += ' slide-menu ' + args.position
        }

        if ( body.classList.contains('menu-open') ) {
          body.classList.remove('menu-open')
          menu.classList.remove('open')
          body.classList.add('menu-closing')
          setTimeout( function () {
            body.classList.remove('menu-closing')
          }, 200)
        } else {
          body.classList.add('menu-opening')
          setTimeout( function () {
            body.classList.remove('menu-opening')
            body.classList.add('menu-open')
            menu.classList.add('open')
          }, 200)
        }

        menuShadow.addEventListener('click', function () {
          body.classList.remove('menu-open')
          menu.classList.remove('open')
          body.classList.add('menu-closing')
          setTimeout( function () {
            body.classList.remove('menu-closing')
            body.removeChild(menuShadow)
            if ( menu.parentNode !== null ) {
              body.removeChild(menu)
            }
          }, 200)
        }, false)
      }, false)
    },

    // ajaxFormBinding: function(options) {
    //   var form = document.querySelector(options.formSelector),
    //       format = options.format || 'json',
    //       type = options.type || 'direct'

    //   form.addEventListener('submit', function (e) {
    //     var request = new XMLHttpRequest(),
    //         formData = new FormData(form),
    //         data

    //     e.preventDefault()

    //     request.open('POST', form.action + '/format/' + format + '/type/' + type, true)
    //     request.setRequestHeader('X-Requested-With', 'XMLHttpRequest')
    //     // request.setRequestHeader('Content-Type', 'application/json')
    //     request.send(formData)

    //     request.onreadystatechange = function () {
    //       console.log('readyState: ' + request.readyState)
    //       console.log('status: ' + request.status)
    //     }

    //     request.onload = function () {
    //       if ( request.status >= 200 && request.status < 400 ) {
    //         data = JSON.parse(request.responseText)
    //         console.log(data)
    //       } else {
    //         // We reached our target server, but it returned an error
    //       }
    //     }

    //     request.onerror = function () {
    //       // There was a connection error of some sort
    //     }
    //   })

    //   // Some browsers don't include the submit button's value when form.submit() is
    //   // called. This function creates a click listener that duplicates a form's submit
    //   // button as a hidden field so its name/value can be included in AJAX POSTs,
    //   // allowing different processing based on different submit buttons.
    //   form.addEventListener('click', function (e) {
    //     var input = document.createElement('input'),
    //         previousActions = form.querySelectorAll('input[type="hidden"].submit-surrogate')

    //     for ( var i = 0; i < previousActions.length; i++ ) {
    //       form.removeChild(previousActions[i])
    //     }

    //     if ( e.target.type && e.target.type.toLowerCase() === 'submit' ) {
    //       input.name = e.target.name
    //       input.type = 'hidden'
    //       input.value = e.target.value
    //       input.className = 'submit-surrogate'

    //       form.appendChild(input)
    //     }
    //   })
    // }
  }

  //  Public methods
  return {
    // ajaxFormBinding: methods.ajaxFormBinding,
    init:       methods.init,
    imageZoom:  methods.imageZoom,
    menu:       methods.menu
  }

}(JAY))
