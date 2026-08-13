JAY.global = ( function () {
  'use strict'

  const methods = {

    // Initialize behavior shared by every page, with each method exiting early when its required markup is absent.
    init: function () {
      methods.fixedHeader()
      methods.mobileMenu()
      methods.imageLoad()
      methods.imageZoom()
      methods.studyToc()
    },

    // Hide the sticky header while scrolling down and reveal it when the user scrolls back up.
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

    // Control the mobile navigation overlay, including focus containment and background inertness.
    mobileMenu: function () {
      const toggle = document.querySelector('.menu-toggle'),
            menu = document.querySelector('.mobile-menu'),
            closeButton = document.querySelector('.menu-close')

      if ( !toggle || !menu || !closeButton ) return

      let previousFocus
      let inerted = []

      // Close the menu, restore the surrounding page, and return focus to the element that opened it.
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

      // Close on Escape and loop Tab focus between the first and last interactive menu elements.
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

        // Disable interaction with every element outside the overlay while the modal menu is open.
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

      // Close an open mobile menu if the viewport crosses into the desktop navigation layout.
      const desktopLayout = window.matchMedia('(min-width: 1024px)')
      desktopLayout.addEventListener('change', function (event) {
        if ( event.matches && menu.classList.contains('is-open') ) close()
      })
    },

    // Lazily request responsive Cloudinary images shortly before they enter the viewport.
    imageLoad: function () {
      const images = [...document.querySelectorAll('img[data-src]')]

      // Replace an image placeholder with a Cloudinary URL sized for its rendered width and pixel density.
      const load = function (image) {
        if ( image.classList.contains('loaded') ) return
        const width = Math.max(Math.ceil(image.getBoundingClientRect().width * window.devicePixelRatio), 480)
        image.src = image.dataset.src.replace('[parameters]', 'f_auto,q_80,w_' + width)
        image.classList.add('loaded')
      }

      // Preload well ahead of the viewport so images are usually decoded before the user reaches them.
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

    // Build and control the accessible, scrollable image zoom overlay for every data-zoom group.
    imageZoom: function () {
      const triggers = [...document.querySelectorAll('a[data-zoom]')]
      if ( !triggers.length ) return

      const dialog = document.createElement('div')
      dialog.className = 'zoom-dialog'
      dialog.hidden = true
      dialog.setAttribute('role', 'dialog')
      dialog.setAttribute('aria-modal', 'true')
      dialog.setAttribute('aria-label', 'Image viewer')
      dialog.innerHTML = '<div class="zoom-bar"><span class="zoom-counter"></span><div class="zoom-actions"><a class="zoom-open" target="_blank" rel="noopener"><span>Open in new tab</span><span aria-hidden="true">↗</span></a><button class="zoom-close" type="button" aria-label="Close image viewer">×</button></div></div><div class="zoom-content"><div class="zoom-track"></div><div class="zoom-progress" role="slider" tabindex="0" aria-label="Image position" aria-orientation="horizontal" aria-valuemin="1" aria-valuemax="1" aria-valuenow="1"><span></span></div><p class="zoom-hint">Drag, swipe, scroll, or use ← →</p></div>'
      document.body.appendChild(dialog)

      const track = dialog.querySelector('.zoom-track'),
            counter = dialog.querySelector('.zoom-counter'),
            openTab = dialog.querySelector('.zoom-open'),
            closeButton = dialog.querySelector('.zoom-close'),
            progress = dialog.querySelector('.zoom-progress'),
            progressThumb = progress.querySelector('span'),
            previewLoadTimeout = 15000

      let activeTrigger,
          pendingTrigger,
          activeIndex = 0,
          slides = [],
          inerted = [],
          draggingProgress = false,
          positioningTrack = false,
          openRequest = 0,
          resizeFrame

      // Return an image's decoded source ratio, excluding the placeholder used by lazy-loaded thumbnails.
      const sourceRatio = function (image) {
        const isPlaceholder = image?.dataset.src && image.currentSrc.includes('/images/placeholder-screen.svg')

        if ( !image?.complete || !image.naturalWidth || !image.naturalHeight || isPlaceholder ) return null

        return image.naturalWidth / image.naturalHeight
      }

      // Size one desktop slide from its source ratio and the viewer's current available space.
      const sizeSlide = function (slide) {
        const ratio = Number(slide.dataset.ratio),
              width = ratio
                ? Math.min(window.innerWidth - 80, ( window.innerHeight - 220 ) * ratio)
                : window.innerWidth - 80

        slide.style.setProperty('--zoom-slide-width', width + 'px')
      }

      // Center the current slide after the track has been built or its geometry has changed.
      const centerActiveSlide = function () {
        if ( !slides.length ) return

        track.scrollLeft = slides[activeIndex].offsetLeft - track.offsetLeft - ( track.clientWidth - slides[activeIndex].clientWidth ) / 2
        updateProgress()
      }

      // Clear the loading state for a pending viewer request without affecting a newer request.
      const clearPendingOpen = function (trigger) {
        if ( !trigger ) return

        trigger.removeAttribute('aria-busy')
        if ( pendingTrigger === trigger ) pendingTrigger = null
      }

      // Upgrade one slide from its preview to the full-resolution Cloudinary image without changing its geometry.
      const loadSlide = function (index) {
        const image = slides[index]?.querySelector('img')

        if ( !image || image.dataset.loading || image.dataset.loaded ) return

        const source = new Image()

        // Give the closest images network priority while still warming slides farther from the active image.
        image.dataset.loading = 'true'
        source.fetchPriority = Math.abs(index - activeIndex) <= 1 ? 'high' : 'low'
        source.addEventListener('load', function () {
          image.src = source.src
          image.dataset.loaded = 'true'
          delete image.dataset.loading
        })
        source.addEventListener('error', function () {
          delete image.dataset.loading
        })
        source.src = image.dataset.fullSrc
      }

      // Preload the active image and two images in either direction for responsive touch scrolling.
      const loadNearbySlides = function (index) {
        for ( let offset = -2; offset <= 2; offset++ ) loadSlide(index + offset)
      }

      // Synchronize active-slide state, controls, accessible values, and nearby image loading.
      const update = function (index) {
        activeIndex = Math.max(0, Math.min(index, slides.length - 1))
        loadNearbySlides(activeIndex)
        counter.textContent = 'Image ' + ( activeIndex + 1 ) + ' of ' + slides.length
        openTab.href = slides[activeIndex].querySelector('img').dataset.original
        dialog.style.setProperty('--zoom-progress-width', ( 100 / slides.length ) + '%')
        progress.setAttribute('aria-valuemax', slides.length)
        progress.setAttribute('aria-valuenow', activeIndex + 1)
        progress.setAttribute('aria-valuetext', 'Image ' + ( activeIndex + 1 ) + ' of ' + slides.length)
      }

      // Position the progress thumb according to the track's current physical scroll offset.
      const updateProgress = function () {
        const maxScroll = track.scrollWidth - track.clientWidth
        const ratio = maxScroll > 0 ? track.scrollLeft / maxScroll : 0
        dialog.style.setProperty('--zoom-progress-offset', ( ratio * ( slides.length - 1 ) * 100 ) + '%')
      }

      // Center a requested slide and update the viewer state used by keyboard navigation.
      const scrollToIndex = function (index) {
        const next = Math.max(0, Math.min(index, slides.length - 1))
        const left = slides[next].offsetLeft - track.offsetLeft - ( track.clientWidth - slides[next].clientWidth ) / 2
        track.scrollTo({ left: left, behavior: 'smooth' })
        update(next)
      }

      // Reset the reusable viewer, restore page interaction, and return focus to the originating thumbnail.
      const close = function () {
        // Suppress scroll events emitted while the old track is reset so they cannot affect the next group opened.
        positioningTrack = true
        openRequest++
        clearPendingOpen(pendingTrigger)
        dialog.hidden = true
        dialog.classList.remove('is-single', 'is-direct-scroll')
        progress.classList.remove('is-dragging')
        draggingProgress = false
        activeIndex = 0
        track.scrollLeft = 0
        track.innerHTML = ''
        slides = []
        inerted.forEach((element) => { element.inert = false })
        inerted = []
        document.documentElement.classList.remove('zoom-active')
        document.removeEventListener('keydown', keydown)
        if ( activeTrigger ) activeTrigger.focus()
      }

      // Handle viewer dismissal, slide navigation, progress shortcuts, and modal focus containment.
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

      // Populate the viewer from the selected thumbnail's group and position it on the requested image.
      const open = function (trigger, request, loadedRatio) {
        // Ignore superseded thumbnail requests and queued clicks dispatched after the viewer opened.
        if ( request !== openRequest || !dialog.hidden ) return

        positioningTrack = true
        const group = trigger.closest('[data-zoom-group]'),
              groupTriggers = group ? [...group.querySelectorAll('a[data-zoom]')] : [ trigger ],
              uniqueTriggers = groupTriggers.filter((item, index) => groupTriggers.indexOf(item) === index),
              triggerImage = trigger.querySelector('img'),
              fallbackRatio = loadedRatio || sourceRatio(triggerImage),
              width = Math.min(Math.max(Math.ceil(window.innerWidth * window.devicePixelRatio), 1200), 2400)

        // Delay track construction until the clicked Cloudinary image provides a trustworthy source ratio.
        if ( !fallbackRatio ) {
          const preview = new Image(),
                previewSource = triggerImage?.dataset.src
                  ? triggerImage.dataset.src.replace('[parameters]', 'f_auto,q_50,w_600')
                  : trigger.href
          let timeout

          trigger.setAttribute('aria-busy', 'true')
          preview.addEventListener('load', function () {
            window.clearTimeout(timeout)
            if ( request !== openRequest || pendingTrigger !== trigger || !dialog.hidden ) return

            const ratio = preview.naturalWidth / preview.naturalHeight
            if ( !Number.isFinite(ratio) || ratio <= 0 ) {
              clearPendingOpen(trigger)
              return
            }

            open(trigger, request, ratio)
          }, { once: true })
          preview.addEventListener('error', function () {
            // End the pending state so a failed preview can be retried instead of failing silently forever.
            window.clearTimeout(timeout)
            if ( request !== openRequest || pendingTrigger !== trigger ) return
            clearPendingOpen(trigger)
          }, { once: true })

          // Release a request that never completes so the same thumbnail can be tried again.
          timeout = window.setTimeout(function () {
            if ( request !== openRequest || pendingTrigger !== trigger ) return
            preview.src = ''
            clearPendingOpen(trigger)
          }, previewLoadTimeout)
          preview.src = previewSource
          return
        }

        clearPendingOpen(trigger)
        activeTrigger = trigger
        activeIndex = Math.max(0, uniqueTriggers.indexOf(trigger))

        // Reset scroll state before replacing slides to prevent stale scroll events from changing the new index.
        track.scrollLeft = 0
        track.innerHTML = ''

        uniqueTriggers.forEach((item) => {
          const sourceImage = item.querySelector('img'),
                figure = document.createElement('figure'),
                image = document.createElement('img'),
                caption = document.createElement('figcaption'),
                previewSource = sourceImage?.dataset.src
                  ? sourceImage.dataset.src.replace('[parameters]', 'f_auto,q_50,w_600')
                  : item.href,
                sourceImageRatio = sourceRatio(sourceImage),
                preview = sourceImageRatio ? sourceImage.currentSrc || sourceImage.src : previewSource,
                imageRatio = sourceImageRatio || fallbackRatio

          // Size each slide from its Cloudinary source ratio so captions align and adjacent images remain visible.
          figure.className = 'zoom-slide'
          figure.dataset.ratio = imageRatio
          sizeSlide(figure)
          image.src = preview
          image.dataset.fullSrc = sourceImage?.dataset.src ? sourceImage.dataset.src.replace('[parameters]', 'f_auto,q_80,w_' + width) : item.href
          image.dataset.original = item.href
          caption.textContent = item.closest('figure')?.querySelector('figcaption')?.textContent || sourceImage?.alt || ''
          image.alt = ''
          figure.append(image, caption)
          track.appendChild(figure)
        })

        slides = [...track.children]

        // Treat the viewer as a modal by making every other top-level page element temporarily inert.
        inerted = [...document.body.children].filter((element) => element !== dialog && !element.inert)
        inerted.forEach((element) => { element.inert = true })
        dialog.classList.toggle('is-single', slides.length === 1)
        dialog.hidden = false
        document.documentElement.classList.add('zoom-active')
        document.addEventListener('keydown', keydown)
        update(activeIndex)

        // Wait for layout before centering, then allow ordinary scroll events after the position has settled.
        requestAnimationFrame(() => {
          centerActiveSlide()
          closeButton.focus()
          requestAnimationFrame(() => { positioningTrack = false })
        })
      }

      // Start one viewer request at a time while allowing a different pending thumbnail to supersede it.
      const requestOpen = function (trigger) {
        if ( !dialog.hidden || pendingTrigger === trigger ) return

        clearPendingOpen(pendingTrigger)
        pendingTrigger = trigger
        openRequest++
        open(trigger, openRequest)
      }

      // Recalculate desktop slide widths and preserve the active image when the viewport changes.
      const resize = function () {
        if ( dialog.hidden || !slides.length ) return
        if ( resizeFrame ) cancelAnimationFrame(resizeFrame)

        resizeFrame = requestAnimationFrame(() => {
          resizeFrame = null
          positioningTrack = true
          slides.forEach(sizeSlide)
          centerActiveSlide()
          requestAnimationFrame(() => { positioningTrack = false })
        })
      }

      triggers.forEach((trigger) => {
        trigger.addEventListener('click', function (event) {
          event.preventDefault()
          requestOpen(trigger)
        })
      })

      closeButton.addEventListener('click', close)
      window.addEventListener('resize', resize, { passive: true })
      track.addEventListener('pointerdown', function () {
        // Native pointer scrolling must remain free of scroll snapping on touch-capable input devices.
        dialog.classList.add('is-direct-scroll')
      })
      track.addEventListener('wheel', function (event) {
        dialog.classList.add('is-direct-scroll')

        // Translate a conventional vertical mouse wheel into horizontal track movement.
        if ( slides.length > 1 && Math.abs(event.deltaY) > Math.abs(event.deltaX) ) {
          event.preventDefault()
          track.scrollLeft += event.deltaY
        }
      }, { passive: false })

      // Convert a pointer position on the progress control into the corresponding track scroll offset.
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

      // Finish a progress-control drag and release its captured pointer.
      const stopProgressDrag = function (event) {
        if ( !draggingProgress ) return
        draggingProgress = false
        progress.classList.remove('is-dragging')
        if ( progress.hasPointerCapture(event.pointerId) ) progress.releasePointerCapture(event.pointerId)
      }
      progress.addEventListener('pointerup', stopProgressDrag)
      progress.addEventListener('pointercancel', stopProgressDrag)
      track.addEventListener('scroll', function () {
        // Ignore the synthetic scroll events produced while opening or clearing the reusable track.
        if ( !slides.length || positioningTrack ) return
        updateProgress()

        // Find the slide whose center is nearest the viewport center after native scrolling.
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

    // Build the case-study table of contents and move it between content and sidebar at the layout breakpoint.
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

      // Create links from the case-study headings while preserving any authored heading IDs.
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

      // Reuse the server-rendered navigation in either location instead of duplicating its markup.
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
