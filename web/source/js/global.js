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
          body.classList.add('hidden-header')
        // The minus 10 pixels is to keep the header from popping in with only slight movements (happens frequently when using touchscreens and touch input devices)
        // The second half of the statement deals with Safari's bounceback when you scroll past the top of the page
        } else if ( body.getBoundingClientRect().top - 10 >= bodyOffset || Math.abs(body.getBoundingClientRect().top) <= header.getBoundingClientRect().height ) {
          body.classList.remove('hidden-header')
        }

        bodyOffset = body.getBoundingClientRect().top
      })
    },

    imageLoad: function () {
      var load = function () {
            const images = document.querySelectorAll('img[data-src]:not(.loaded)')
            
            if ( images.length ) {
              images.forEach( function (item) {
                // Make sure all images have an explicit width or height set in CSS for best results
                let dimension
                // Default to width on mobile since most images are set to 100% width
                if ( document.body.clientWidth < 768 ) {
                  dimension = item.clientWidth ? 'w_' + item.clientWidth : 'h_' + item.clientHeight
                // Default to height on larger devices
                } else {
                  dimension = item.clientHeight ? 'h_' + item.clientHeight : 'w_' + item.clientWidth
                }

                // If the image is within 2 screen heights of the current offset, load it
                if ( item.getBoundingClientRect().top < ( document.body.clientHeight * 2 ) ) {
                  item.src = item.dataset.src.replace('[parameters]', 'f_auto,q_80,' + dimension + ',dpr_' + Math.ceil(window.devicePixelRatio) + '.0')
                  item.classList.add('loaded')
                  if ( item.parentNode.parentNode.tagName === 'FIGURE' ) {
                    methods.imageZoom(item)
                  }
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
      var mask    = document.getElementById('mask') || document.createElement('div'),
          anchor  = item.parentNode,
          img     = document.createElement('img'),
          src     = item.dataset.src.replace('[parameters]', 'f_auto,q_80,dpr_' + Math.ceil(window.devicePixelRatio) + '.0')

      mask.setAttribute('id', 'mask')
      document.body.appendChild(mask)

      anchor.addEventListener('click', function (e) {
        e.preventDefault()
        mask.innerHTML = '<a id="mask-open-tab" href="' + src + '" target="_blank">Open this image in a new tab</a><a id="mask-close" href="#">Close</a>'
        document.querySelector('html').classList.add('mask-enabled')
        mask.classList.add('enabled')
        img.setAttribute('src', src)
        mask.append(img)
        // Add the loading spinner after a brief delay, otherwise it pops in and out and looks bad
        setTimeout( function () {
          if ( img.naturalWidth === 0 ) {
            mask.classList.add('loading')

            setTimeout( function () {
              mask.classList.remove('loading')
            }, 10000)
          }
        }, 500)

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
          mask.classList.remove('enabled', 'loading')
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
    imageZoom:  methods.imageZoom
  }

}(JAY))
