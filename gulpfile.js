import autoprefixer  from 'autoprefixer'
import concat        from 'gulp-concat'
import cssnano       from 'gulp-cssnano'
import filter        from 'gulp-filter'
import gulp          from 'gulp'
import gulpsass      from 'gulp-sass'
import browsersync   from 'browser-sync'
import postcss       from 'gulp-postcss'
import * as nodesass from 'sass'
import sourcemaps    from 'gulp-sourcemaps'
import uglify        from 'gulp-uglify-es'

const sass = gulpsass(nodesass)
const browserSyncOrigin = process.env.BROWSERSYNC_ORIGIN
const polling = process.env.GULP_USE_POLLING === 'true'
const pollingInterval = Number(process.env.GULP_POLLING_INTERVAL || 500)
const watchOptions = {
  usePolling: polling,
  interval: pollingInterval
}

gulp.task('css', function () {
  return gulp.src(['web/source/scss/site.scss'])
      .pipe(sourcemaps.init())
      .pipe(sass().on('error', sass.logError))
      .pipe(postcss([autoprefixer()]))
      .pipe(cssnano({ safe: true, colormin: false }))
      .pipe(concat('site.css'))
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest('web/min'))
      .pipe(filter('**/*.css*'))
      .pipe(browsersync.stream())
})

gulp.task('js', function () {
  return gulp.src([
            'web/source/js/immediate.js',
            'web/source/js/**/*.js'
          ])
      .pipe(sourcemaps.init())
      .pipe(uglify.default())
      .pipe(concat('site.js'))
      .pipe(sourcemaps.write(''))
      .pipe(gulp.dest('web/min'))
      .pipe(browsersync.stream())
})

gulp.task('reload', function (done) {
  // Slight delay in browser reload to give citizen time to reinitialize module updates
  setTimeout( () => {
    browsersync.reload()
    done()
  }, 500)
})

gulp.task('watch', function (done) {
  if ( !browserSyncOrigin ) {
    throw new Error('Missing required environment variable: BROWSERSYNC_ORIGIN')
  }

  browsersync.init({
    listen: '0.0.0.0',
    port: 3000,
    ui: false,
    logSnippet: false,
    socket: {
      domain: browserSyncOrigin
    },
    notify: false,
    open: false
  })
  gulp.watch('web/source/scss/**/**.scss', watchOptions, gulp.parallel('css'))
  gulp.watch('web/source/js/**/**.js', watchOptions, gulp.parallel('js'))
  gulp.watch('app/controllers/**', watchOptions, gulp.parallel('reload'))
  gulp.watch('app/models/**', watchOptions, gulp.parallel('reload'))
  gulp.watch('app/views/**', watchOptions, gulp.parallel('reload'))
  gulp.watch('app/helpers/**', watchOptions, gulp.parallel('reload'))
  done()
})

gulp.task('default', gulp.parallel('watch'))
gulp.task('all', gulp.parallel('css', 'js'))
