JAY.global = ( function () {
  'use strict'

  const methods = {

    init: function () {
      methods.fixedHeader()
      methods.mobileMenu()
      methods.imageLoad()
      methods.imageZoom()
      methods.studyToc()
    },

    fixedHeader: function () {
      const body   = document.querySelector('body'),
            header = document.querySelector('body > header')

      if ( !body || !header ) return

      let bodyOffset = 0

      window.addEventListener('scroll', function () {
        const currentOffset = body.getBoundingClientRect().top

        // The second half of each of the following IF statements deals with Safari's bounceback when
        // you scroll past the top of the page

        // scroll down
        if ( !body.classList.contains('hidden-header') && bodyOffset > currentOffset && Math.abs(currentOffset) > header.getBoundingClientRect().height ) {
          body.classList.add('hidden-header')
          body.classList.remove('fixed-header')
        // scroll up
        // The minus 10 pixels keeps the header from appearing after slight movements, which happens
        // frequently with touchscreens and other touch input devices.
        } else if ( ( !body.classList.contains('fixed-header') && currentOffset - 10 >= bodyOffset ) || Math.abs(currentOffset) <= header.getBoundingClientRect().height ) {
          body.classList.remove('hidden-header')
          if ( bodyOffset < -110 ) body.classList.add('fixed-header')
        }

        bodyOffset = currentOffset

        if ( bodyOffset === 0 ) body.classList.remove('fixed-header')
      }, { passive: true })
    },

    mobileMenu: function () {
      const toggle = document.querySelector('.menu-toggle'),
            menu = document.querySelector('.mobile-menu'),
            closeButton = document.querySelector('.menu-close')

      if ( !toggle || !menu || !closeButton ) return

      let previousFocus
      let inerted = []

      const close = function () {
        menu.classList.remove('is-open')
        menu.setAttribute('aria-hidden', 'true')
        toggle.setAttribute('aria-expanded', 'false')
        inerted.forEach((element) => { element.inert = false })
        inerted = []
        document.documentElement.classList.remove('menu-open')
        document.removeEventListener('keydown', keydown)
        if ( previousFocus ) previousFocus.focus()
      }

      const keydown = function (event) {
        if ( event.key === 'Escape' ) close()
        if ( event.key !== 'Tab' ) return

        const focusable = [...menu.querySelectorAll('a, button')]
        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if ( event.shiftKey && document.activeElement === first ) {
          event.preventDefault()
          last.focus()
        } else if ( !event.shiftKey && document.activeElement === last ) {
          event.preventDefault()
          first.focus()
        }
      }

      toggle.addEventListener('click', function () {
        previousFocus = document.activeElement
        inerted = [
          ...[...document.body.children].filter((element) => !element.contains(menu) && !element.inert),
          ...[...menu.parentElement.children].filter((element) => element !== menu && !element.inert)
        ]
        inerted.forEach((element) => { element.inert = true })
        menu.classList.add('is-open')
        menu.setAttribute('aria-hidden', 'false')
        toggle.setAttribute('aria-expanded', 'true')
        document.documentElement.classList.add('menu-open')
        document.addEventListener('keydown', keydown)
        requestAnimationFrame(() => closeButton.focus())
      })

      closeButton.addEventListener('click', close)
      menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', close))

      const desktopLayout = window.matchMedia('(min-width: 1024px)')
      desktopLayout.addEventListener('change', function (event) {
        if ( event.matches && menu.classList.contains('is-open') ) close()
      })
    },

    imageLoad: function () {
      const images = [...document.querySelectorAll('img[data-src]')]

      const load = function (image) {
        if ( image.classList.contains('loaded') ) return
        const width = Math.max(Math.ceil(image.getBoundingClientRect().width * window.devicePixelRatio), 480)
        image.src = image.dataset.src.replace('[parameters]', 'f_auto,q_80,w_' + width)
        image.classList.add('loaded')
      }

      if ( 'IntersectionObserver' in window ) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if ( entry.isIntersecting ) {
              load(entry.target)
              observer.unobserve(entry.target)
            }
          })
        }, { rootMargin: '150% 0px' })

        images.forEach((image) => observer.observe(image))
      } else {
        images.forEach(load)
      }
    },

    imageZoom: function () {
      const triggers = [...document.querySelectorAll('a[data-zoom]')]
      if ( !triggers.length ) return

      const dialog = document.createElement('div')
      dialog.className = 'zoom-dialog'
      dialog.hidden = true
      dialog.setAttribute('role', 'dialog')
      dialog.setAttribute('aria-modal', 'true')
      dialog.setAttribute('aria-label', 'Image viewer')
      dialog.innerHTML = '<div class="zoom-bar"><span class="zoom-counter"></span><div class="zoom-actions"><a class="zoom-open" target="_blank" rel="noopener"><span>Open in new tab</span> ↗</a><button class="zoom-close" type="button" aria-label="Close image viewer">×</button></div></div><div class="zoom-content"><div class="zoom-track"></div><div class="zoom-progress" role="slider" tabindex="0" aria-label="Image position" aria-orientation="horizontal" aria-valuemin="1" aria-valuemax="1" aria-valuenow="1"><span></span></div><p class="zoom-hint">Drag, swipe, scroll, or use ← →</p></div>'
      document.body.appendChild(dialog)

      const track = dialog.querySelector('.zoom-track'),
            counter = dialog.querySelector('.zoom-counter'),
            openTab = dialog.querySelector('.zoom-open'),
            closeButton = dialog.querySelector('.zoom-close'),
            progress = dialog.querySelector('.zoom-progress'),
            progressThumb = progress.querySelector('span')

      let activeTrigger
      let activeIndex = 0
      let slides = []
      let inerted = []
      let draggingProgress = false

      const update = function (index) {
        activeIndex = Math.max(0, Math.min(index, slides.length - 1))
        counter.textContent = 'Image ' + ( activeIndex + 1 ) + ' of ' + slides.length
        openTab.href = slides[activeIndex].querySelector('img').src
        dialog.style.setProperty('--zoom-progress-width', ( 100 / slides.length ) + '%')
        progress.setAttribute('aria-valuemax', slides.length)
        progress.setAttribute('aria-valuenow', activeIndex + 1)
        progress.setAttribute('aria-valuetext', 'Image ' + ( activeIndex + 1 ) + ' of ' + slides.length)
      }

      const updateProgress = function () {
        const maxScroll = track.scrollWidth - track.clientWidth
        const ratio = maxScroll > 0 ? track.scrollLeft / maxScroll : 0
        dialog.style.setProperty('--zoom-progress-offset', ( ratio * ( slides.length - 1 ) * 100 ) + '%')
      }

      const scrollToIndex = function (index) {
        const next = Math.max(0, Math.min(index, slides.length - 1))
        const left = slides[next].offsetLeft - track.offsetLeft - ( track.clientWidth - slides[next].clientWidth ) / 2
        track.scrollTo({ left: left, behavior: 'smooth' })
        update(next)
      }

      const close = function () {
        dialog.hidden = true
        dialog.classList.remove('is-single', 'is-direct-scroll')
        progress.classList.remove('is-dragging')
        draggingProgress = false
        track.innerHTML = ''
        slides = []
        inerted.forEach((element) => { element.inert = false })
        inerted = []
        document.documentElement.classList.remove('zoom-active')
        document.removeEventListener('keydown', keydown)
        if ( activeTrigger ) activeTrigger.focus()
      }

      const keydown = function (event) {
        if ( event.key === 'Escape' ) close()
        if ( event.key === 'ArrowRight' ) {
          event.preventDefault()
          dialog.classList.remove('is-direct-scroll')
          scrollToIndex(activeIndex + 1)
        }
        if ( event.key === 'ArrowLeft' ) {
          event.preventDefault()
          dialog.classList.remove('is-direct-scroll')
          scrollToIndex(activeIndex - 1)
        }
        if ( document.activeElement === progress && event.key === 'Home' ) {
          event.preventDefault()
          dialog.classList.remove('is-direct-scroll')
          scrollToIndex(0)
        }
        if ( document.activeElement === progress && event.key === 'End' ) {
          event.preventDefault()
          dialog.classList.remove('is-direct-scroll')
          scrollToIndex(slides.length - 1)
        }
        if ( event.key === 'Tab' ) {
          const focusable = slides.length === 1 ? [ openTab, closeButton ] : [ openTab, closeButton, progress ]
          if ( event.shiftKey && document.activeElement === focusable[0] ) {
            event.preventDefault()
            focusable[focusable.length - 1].focus()
          } else if ( !event.shiftKey && document.activeElement === focusable[focusable.length - 1] ) {
            event.preventDefault()
            focusable[0].focus()
          }
        }
      }

      const open = function (trigger) {
        activeTrigger = trigger
        const group = trigger.closest('[data-zoom-group]')
        const groupTriggers = group ? [...group.querySelectorAll('a[data-zoom]')] : [ trigger ]
        const uniqueTriggers = groupTriggers.filter((item, index) => groupTriggers.indexOf(item) === index)
        activeIndex = Math.max(0, uniqueTriggers.indexOf(trigger))
        track.innerHTML = ''

        uniqueTriggers.forEach((item) => {
          const sourceImage = item.querySelector('img')
          const figure = document.createElement('figure')
          const image = document.createElement('img')
          const caption = document.createElement('figcaption')
          figure.className = 'zoom-slide'
          image.addEventListener('load', function () {
            requestAnimationFrame(() => {
              if ( dialog.hidden || !slides.length ) return
              const currentSlide = slides[activeIndex]
              track.scrollLeft = currentSlide.offsetLeft - track.offsetLeft - ( track.clientWidth - currentSlide.clientWidth ) / 2
              updateProgress()
            })
          })
          image.src = item.href
          image.alt = sourceImage ? sourceImage.alt : ''
          caption.textContent = item.closest('figure')?.querySelector('figcaption')?.textContent || image.alt
          figure.append(image, caption)
          track.appendChild(figure)
        })

        slides = [...track.children]
        inerted = [...document.body.children].filter((element) => element !== dialog && !element.inert)
        inerted.forEach((element) => { element.inert = true })
        dialog.classList.toggle('is-single', slides.length === 1)
        dialog.hidden = false
        document.documentElement.classList.add('zoom-active')
        document.addEventListener('keydown', keydown)
        update(activeIndex)
        requestAnimationFrame(() => {
          track.scrollLeft = slides[activeIndex].offsetLeft - track.offsetLeft - ( track.clientWidth - slides[activeIndex].clientWidth ) / 2
          updateProgress()
          closeButton.focus()
        })
      }

      triggers.forEach((trigger) => {
        trigger.addEventListener('click', function (event) {
          event.preventDefault()
          open(trigger)
        })
      })

      closeButton.addEventListener('click', close)
      track.addEventListener('pointerdown', function () {
        dialog.classList.add('is-direct-scroll')
      })
      track.addEventListener('wheel', function (event) {
        dialog.classList.add('is-direct-scroll')
        if ( slides.length > 1 && Math.abs(event.deltaY) > Math.abs(event.deltaX) ) {
          event.preventDefault()
          track.scrollLeft += event.deltaY
        }
      }, { passive: false })
      const scrubProgress = function (event) {
        const bounds = progress.getBoundingClientRect()
        const travel = bounds.width - progressThumb.offsetWidth
        const offset = Math.max(0, Math.min(event.clientX - bounds.left - progressThumb.offsetWidth / 2, travel))
        track.scrollLeft = travel > 0 ? ( offset / travel ) * ( track.scrollWidth - track.clientWidth ) : 0
      }
      progress.addEventListener('pointerdown', function (event) {
        if ( slides.length <= 1 ) return
        event.preventDefault()
        dialog.classList.add('is-direct-scroll')
        draggingProgress = true
        progress.classList.add('is-dragging')
        progress.setPointerCapture(event.pointerId)
        scrubProgress(event)
      })
      progress.addEventListener('pointermove', function (event) {
        if ( !draggingProgress ) return
        scrubProgress(event)
      })
      const stopProgressDrag = function (event) {
        if ( !draggingProgress ) return
        draggingProgress = false
        progress.classList.remove('is-dragging')
        if ( progress.hasPointerCapture(event.pointerId) ) progress.releasePointerCapture(event.pointerId)
      }
      progress.addEventListener('pointerup', stopProgressDrag)
      progress.addEventListener('pointercancel', stopProgressDrag)
      track.addEventListener('scroll', function () {
        if ( !slides.length ) return
        updateProgress()
        const center = track.scrollLeft + track.clientWidth / 2
        let nearest = 0
        let distance = Infinity
        slides.forEach((slide, index) => {
          const slideCenter = slide.offsetLeft - track.offsetLeft + slide.clientWidth / 2
          const nextDistance = Math.abs(center - slideCenter)
          if ( nextDistance < distance ) {
            nearest = index
            distance = nextDistance
          }
        })
        if ( nearest !== activeIndex ) update(nearest)
      }, { passive: true })
    },

    studyToc: function () {
      const content = document.querySelector('body[data-controller="case-study"] main > section > article'),
            toc = content?.querySelector('nav[aria-label="In this study"]'),
            list = toc?.querySelector('ol'),
            sidebar = document.querySelector('body[data-controller="case-study"] main > section > aside'),
            summary = content?.querySelector('p')
      if ( !content || !toc || !list || !sidebar || !summary ) return

      const headings = [...content.querySelectorAll('h2, h3')].filter((heading) => !heading.closest('nav[aria-label="In this study"]'))
      if ( !headings.length ) {
        toc.hidden = true
        return
      }

      headings.forEach((heading, index) => {
        if ( !heading.id ) heading.id = 'study-section-' + ( index + 1 )
        const item = document.createElement('li')
        const link = document.createElement('a')
        link.href = '#' + heading.id
        link.textContent = heading.textContent
        item.appendChild(link)
        list.appendChild(item)
      })

      const desktopLayout = window.matchMedia('(min-width: 1440px)')
      const placeToc = function (event) {
        if ( event.matches ) {
          sidebar.insertBefore(toc, sidebar.firstChild)
        } else {
          summary.insertAdjacentElement('afterend', toc)
        }
      }

      placeToc(desktopLayout)
      desktopLayout.addEventListener('change', placeToc)
    }
  }

  return {
    init: methods.init
  }

}(JAY))
