JAY.index = ( function () {
  'use strict'

  const methods = {

    init: function () {
      methods.carousel()
    },

    carousel: function () {
      let section = document.querySelector('section.quotes'),
          quotes  = document.querySelectorAll('section.quotes blockquote'),
          dots    = [],
          current = 0,
          timer   = null,
          dotsNav = document.createElement('nav')

      if ( !section || quotes.length <= 1 ) return

      dotsNav.classList.add('carousel-dots')
      section.classList.add('carousel')
      quotes[0].classList.add('active')

      quotes.forEach( function (quote, index) {
        let dot = document.createElement('button')
        dot.setAttribute('type', 'button')
        dot.setAttribute('aria-label', 'Quote ' + ( index + 1 ) + ' of ' + quotes.length)
        if ( index === 0 ) dot.classList.add('active')
        dot.addEventListener('click', function () {
          current = index
          show(current)
          startTimer()
        })
        dotsNav.appendChild(dot)
        dots.push(dot)
      })

      section.insertAdjacentElement('afterend', dotsNav)

      function show(index) {
        quotes.forEach( function (quote, i) {
          quote.classList.toggle('active', i === index)
        })
        dots.forEach( function (dot, i) {
          dot.classList.toggle('active', i === index)
        })
      }

      function startTimer() {
        clearInterval(timer)
        timer = setInterval( function () {
          current = ( current + 1 ) % quotes.length
          show(current)
        }, 10000)
      }

      section.addEventListener('mouseenter', function () {
        clearInterval(timer)
      })

      section.addEventListener('mouseleave', function () {
        startTimer()
      })

      startTimer()

      // Trigger the image lazy loader to re-check positions now that the carousel
      // has collapsed the stacked quotes and updated the page layout
      window.dispatchEvent(new Event('scroll'))
    }

  }

  //  Public methods
  return {
    init: methods.init
  }

}(JAY))
