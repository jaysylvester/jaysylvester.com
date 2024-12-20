JAY.global = ( function () {
  'use strict'

  const methods = {

    init: function () {
      let mobile = document.body.clientWidth < 768
      if ( !mobile ) {
        methods.fixedHeader()
      }
      methods.imageLoad(mobile)
    },

    fixedHeader: function () {
      let body       = document.querySelector('body'),
          bodyOffset = 0,
          header     = document.querySelector('body > header')

      window.addEventListener('scroll', () => {
        // The second half of each of the following IF statements deals with Safari's bounceback when
        // you scroll past the top of the page

        // scroll down
        if ( !body.classList.contains('hidden-header') && bodyOffset > body.getBoundingClientRect().top && Math.abs(body.getBoundingClientRect().top) > header.getBoundingClientRect().height ) {
          body.classList.add('hidden-header')
          body.classList.remove('fixed-header')
        // scroll up
        // The minus 10 pixels is to keep the header from popping in with only slight movements, which
        // happens frequently when using touchscreens and touch input devices.
        } else if ( !body.classList.contains('fixed-header') && body.getBoundingClientRect().top - 10 >= bodyOffset || Math.abs(body.getBoundingClientRect().top) <= header.getBoundingClientRect().height ) {
          body.classList.remove('hidden-header')
          if ( bodyOffset < -110 ) {
            body.classList.add('fixed-header')
          }
        }
        bodyOffset = body.getBoundingClientRect().top

        if ( bodyOffset === 0 ) {
          body.classList.remove('fixed-header')
        }
      }, { passive: true })
    },

    // Lazy load images
    imageLoad: function (mobile) {
      let images = document.querySelectorAll('img[data-src]:not(.loaded)')

      const load = function () {
        window.addEventListener('scroll', load, { capture: true, passive: true})
        images.forEach( function (image) {
          // If the image is within 2 viewport heights of the current offset, load it
          if ( image.getBoundingClientRect().top < ( window.innerHeight * 2 ) ) {
            image.src = image.dataset.src.replace('[parameters]', 'f_auto,q_80,' + ( image.clientHeight ? 'h_' + image.clientHeight : 'w_' + image.clientWidth ) + ',dpr_' + Math.ceil(window.devicePixelRatio) + '.0')
            image.classList.add('loaded')
            if ( !mobile && image.parentNode.tagName === 'A' && !image.parentNode.parentNode.classList.contains('devices') ) {
              methods.imageZoom(image)
            }
            images = document.querySelectorAll('img[data-src]:not(.loaded)')
            if ( !images.length ) {
              window.removeEventListener('scroll', load, { capture: true, passive: true})
            }
          }
        })
      }

      if ( images.length ) {
        load()
      }
    },

    imageZoom: function (image) {
      let mask    = document.getElementById('mask') || document.createElement('div'),
          anchor  = image.parentNode,
          img     = document.createElement('img'),
          src     = image.dataset.src.replace('[parameters]', 'f_auto,w_1500,q_80,dpr_' + Math.ceil(window.devicePixelRatio) + '.0'),
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
    }
  }

  //  Public methods
  return {
    init:       methods.init,
    imageZoom:  methods.imageZoom
  }

}(JAY))
