SLC.category = ( function () {
  'use strict'

  var methods = {

    init: function () {
      if ( document.body.clientWidth < 960 ) {
        SLC.global.menu({
          menu: 'main nav.filters',
          trigger: 'main nav.filters > a',
          position: 'bottom'
        })
        SLC.global.menu({
          menu: 'main nav.sort',
          trigger: 'main nav.sort > a',
          position: 'bottom'
        })
      } else {
        document.querySelector('main section.products nav.sort > a').addEventListener('click', function (e) {
          e.preventDefault()
          e.target.parentNode.classList.toggle('active')
        })
        document.querySelector('main section.products nav.sort > section').addEventListener('mouseleave', function (e) {
          e.target.parentNode.classList.toggle('active')
        })
        document.querySelectorAll('main section.products nav.filters > section').forEach(function (item) {
          let moreButton = document.createElement('a')
          moreButton.href = '#'
          moreButton.classList.add('more')
          moreButton.text = 'More'
          moreButton.addEventListener('click', function (e) {
            e.preventDefault()
            e.target.parentNode.classList.toggle('more')
            if ( e.target.text === 'More' ) {
              e.target.className = 'fewer'
              e.target.text = 'Fewer'
            } else {
              e.target.className = 'more'
              e.target.text = 'More'
            }
          })
          item.appendChild(moreButton)
        })
      }
    }

  }

  //  Public methods
  return {
    init: methods.init
  }

}(SLC))
