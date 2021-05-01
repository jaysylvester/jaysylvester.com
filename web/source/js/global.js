JAY.global = ( function () {
  'use strict'

  var methods = {

    init: function () {
      methods.header()
      methods.imageLoad()
    },

    header: function () {
      var body        = document.querySelector('body'),
          bodyOffset  = 0,
          header      = document.querySelector('body > header')

      window.addEventListener('scroll', function () {
        if ( !body.classList.contains('hidden-header') && bodyOffset > body.getBoundingClientRect().top && Math.abs(body.getBoundingClientRect().top) > header.getBoundingClientRect().height ) {
          setTimeout( () => {
            body.classList.remove('fixed-header') // Matches transition time in global.js
          }, 300)
          body.classList.add('hidden-header')
        // The minus 10 pixels is to keep the header from popping in with only slight movements (happens frequently when using touchscreens and touch input devices)
        // The second half of the statement deals with Safari's bounceback when you scroll past the top of the page
        } else if ( body.getBoundingClientRect().top - 10 >= bodyOffset || Math.abs(body.getBoundingClientRect().top) <= header.getBoundingClientRect().height ) {
          body.classList.remove('hidden-header')
          if ( bodyOffset < -110 ) {
            body.classList.add('fixed-header')
          }
        }

        bodyOffset = body.getBoundingClientRect().top

        if ( bodyOffset === 0 ) {
          body.classList.remove('fixed-header')
        }
      })
    },

    // Lazy load images
    imageLoad: function () {
      const load = function () {
        const images = document.querySelectorAll('img[data-src]:not(.loaded)'),
              mobile = document.body.clientWidth < 768
        
        if ( images.length ) {
          images.forEach( function (image) {
            // Make sure all images have an explicit width or height set in CSS for best results
            let dimension
            // Default to width on mobile since most images are set to 100% width
            if ( mobile ) {
              dimension = image.clientWidth ? 'w_' + image.clientWidth : 'h_' + image.clientHeight
            // Default to height on larger devices
            } else {
              dimension = image.clientHeight ? 'h_' + image.clientHeight : 'w_' + image.clientWidth
            }

            // If the image is within 1.5 viewport heights of the current offset, load it
            if ( image.getBoundingClientRect().top < ( document.body.clientHeight * 1.5 ) ) {
              image.src = image.dataset.src.replace('[parameters]', 'f_auto,q_80,' + dimension + ',dpr_' + Math.ceil(window.devicePixelRatio) + '.0')
              image.classList.add('loaded')
              if ( !mobile ) {
                methods.imageZoom(image)
              }
            }
          })
        } else {
          window.removeEventListener('scroll', load)
        }
      }
      
      // Load images within the viewport, then load additional images as the user scrolls
      load()
      window.addEventListener('scroll', load)
    },

    imageZoom: function (image) {
      var mask    = document.getElementById('mask') || document.createElement('div'),
          anchor  = image.parentNode,
          img     = document.createElement('img'),
          src     = image.dataset.src.replace('[parameters]', 'f_auto,q_80,dpr_' + Math.ceil(window.devicePixelRatio) + '.0'),
          loading = function () {
            // Add the loading spinner after a brief delay, otherwise it pops in and out and looks bad
            setTimeout( function () {
              if ( img.naturalWidth === 0 ) {
                mask.classList.add('loading')

                setTimeout( function () {
                  mask.classList.remove('loading')
                }, 10000)
              }
            }, 500)
          }

      mask.setAttribute('id', 'mask')
      document.body.appendChild(mask)

      anchor.addEventListener('click', function (e) {
        e.preventDefault()
        let figureGroup = image.parentNode.parentNode.parentNode.parentNode,
            figureIndex = [...figureGroup.querySelector('section').children].indexOf(anchor.parentNode),
            screenNav = false

        mask.innerHTML = '<h1>Image 1 of 1</h1><a id="mask-open-tab" href="' + src + '" target="_blank">Open this image in a new tab</a><a id="mask-close" href="#">Close</a>'

        // Create navigation if it's a group of images
        if ( figureGroup.getAttribute('role') === 'group' ) {
          mask.querySelector('h1').innerHTML = 'Image <span class="current-image">1</span> of <span class="total-images">1</span>'
          mask.innerHTML += '<nav id="screen-nav"><ul></ul></nav>'
          screenNav = mask.querySelector('#screen-nav')
          figureGroup.querySelectorAll('figure').forEach( function (figure, index) {
            screenNav.querySelector('ul').innerHTML += '<li' + ( index === figureIndex ? ' class="selected"' : '' ) + '><a href="' + figure.querySelector('img').dataset.src.replace('[parameters]', 'f_auto,q_80,dpr_' + Math.ceil(window.devicePixelRatio) + '.0') + '">' + figure.querySelector('img').getAttribute('alt') + '</a></li>'
            mask.querySelector('span.current-image').innerHTML = figureIndex + 1
            mask.querySelector('span.total-images').innerHTML = index + 1
            screenNav.addEventListener('click', function (e) {
              e.preventDefault()
              if ( e.target.tagName === 'A' ) {
                screenNav.querySelectorAll('li').forEach( function (anchor) {
                  anchor.classList.remove('selected')
                })
                mask.querySelector('span.current-image').innerHTML = [...e.target.parentNode.parentNode.children].indexOf(e.target.parentNode) + 1
                e.target.parentNode.classList.add('selected')
                mask.querySelector('#mask-open-tab').setAttribute('href', e.target.href)
                loading()
                img.setAttribute('src', '/images/placeholder-zoom.svg')
                img.setAttribute('src', e.target.href)
              }
            })
          })
        }

        document.querySelector('html').classList.add('mask-enabled')
        mask.classList.add('enabled')
        img.setAttribute('src', src)
        if ( screenNav ) {
          mask.classList.add('screens')
          mask.insertBefore(img, screenNav)
        } else {
          mask.append(img)
        }
        loading()

        window.addEventListener('keydown', escape)
        mask.querySelector('#mask-close').addEventListener('click', function (e) {
          e.preventDefault()
          close()
        })

        function escape(e) {
          if ( e.key === 'Escape' ) {
            close()
          }
        }

        function close() {
          document.querySelector('html').classList.remove('mask-enabled')
          mask.classList.remove('enabled', 'loading', 'screens')
          mask.innerHTML = ''
          window.removeEventListener('keydown', escape)
        }
      })
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
    // }
  }

  //  Public methods
  return {
    // ajaxFormBinding: methods.ajaxFormBinding,
    init:       methods.init,
    imageZoom:  methods.imageZoom
  }

}(JAY))
