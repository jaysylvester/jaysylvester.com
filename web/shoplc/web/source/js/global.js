SLC.global = ( function () {
  'use strict'

  var methods = {

    init: function () {
      methods.header()
      methods.imageLoad()

      if ( document.body.clientWidth < 960 ) {
        methods.menu({
          menu: 'body > header nav.site > ul > li > ul',
          trigger: 'body > header nav.site > ul > li > a',
          position: 'left'
        })
      }
    },

    header: function () {
      var body        = document.querySelector('body'),
          bodyOffset  = 0,
          header      = document.querySelector('body > header')

      window.addEventListener('scroll', function () {
        if ( !body.classList.contains('hidden-header') && bodyOffset > body.getBoundingClientRect().top && Math.abs(body.getBoundingClientRect().top) > header.getBoundingClientRect().height ) {
          body.classList.add('hidden-header')
        // The minus 10 pixels is to keep the header from popping in with only slight movements (happens frequently when using touchscreens and touch input devices)
        // The second half of the statement deals with Safari's bounceback when you scroll past the top of the page
        } else if ( body.getBoundingClientRect().top - 10 >= bodyOffset || Math.abs(body.getBoundingClientRect().top) <= header.getBoundingClientRect().height ) {
          body.classList.remove('hidden-header')
        }

        bodyOffset = body.getBoundingClientRect().top
        if ( bodyOffset < -60 ) {
          body.classList.add('partial-header')
        } else {
          body.classList.remove('partial-header')
        }
      })
    },

    // Delay image loading until users scroll to them
    imageLoad: function () {
      var load = function () {
            const images = document.querySelectorAll('img[data-src]:not(.loaded)')
            
            // If there are images yet to be loaded...
            if ( images.length ) {
              images.forEach( function (image) {
                // If the image is within 1.5 viewport heights of the current offset, load it
                if ( image.getBoundingClientRect().top < ( document.body.clientHeight * 1.5 ) ) {
                  image.src = image.dataset.src
                  image.classList.add('loaded')
                }
              })
            // ...otherwise, remove the scroll listener for performance reasons
            } else {
              window.removeEventListener('scroll', load)
            }
          }
      
      load()

      window.addEventListener('scroll', load)
    },

    menu: function (args) {
      var body = document.querySelector('body'),
          source = document.querySelector(args.menu),
          menu = document.createElement('nav'),
          trigger = document.querySelector(args.trigger)

      menu.appendChild(source.cloneNode(true))

      menu.addEventListener('click', function (e) {
        if ( e.target.tagName === 'A' ) {
          e.preventDefault()
          e.target.parentNode.classList.toggle('active')
        }
      })

      trigger.addEventListener('click', function () {
        var menuShadow = document.createElement('div')

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
    }
  }

  //  Public methods
  return {
    init: methods.init,
    menu: methods.menu
  }

}(SLC))
