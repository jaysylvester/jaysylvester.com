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

gulp.task('css', function (done) {
  gulp.src(['web/source/scss/site.scss'])
      .pipe(sourcemaps.init())
      .pipe(sass().on('error', sass.logError))
      .pipe(postcss([autoprefixer()]))
      .pipe(cssnano({ safe: true, colormin: false }))
      .pipe(concat('site.css'))
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest('web/min'))
      .pipe(filter('**/*.css*'))
      .pipe(browsersync.stream())
  done()
})

gulp.task('js', function (done) {
  gulp.src([
            'web/source/js/immediate.js',
            'web/source/js/**/*.js'
          ])
      .pipe(sourcemaps.init())
      .pipe(uglify.default())
      .pipe(concat('site.js'))
      .pipe(sourcemaps.write(''))
      .pipe(gulp.dest('web/min'))
      .pipe(browsersync.stream())
  done()
})

gulp.task('reload', function (done) {
  // Slight delay in browser reload to give citizen time to reinitialize module updates
  setTimeout( () => {
    browsersync.reload()
    done()
  }, 500)
})

gulp.task('watch', function (done) {
  browsersync.init({
    https: {
      key: '_dev-certs/ssl-cert-snakeoil.key',
      cert: '_dev-certs/ssl-cert-snakeoil.pem'
    },
    ui: {
      port: 8282
    },
    notify: false,
    open: false
  })
  gulp.watch('web/source/scss/**/**.scss', gulp.parallel('css'))
  gulp.watch('web/source/js/**/**.js', gulp.parallel('js'))
  gulp.watch('app/controllers/**', gulp.parallel('reload'))
  gulp.watch('app/models/**', gulp.parallel('reload'))
  gulp.watch('app/views/**', gulp.parallel('reload'))
  gulp.watch('app/toolbox/**', gulp.parallel('reload'))
  done()
})

gulp.task('default', gulp.parallel('watch'))
gulp.task('all', gulp.parallel('css', 'js'))
