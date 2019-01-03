'use strict'

var autoprefixer  = require('autoprefixer'),
    concat        = require('gulp-concat'),
    cssnano       = require('gulp-cssnano'),
    filter        = require('gulp-filter'),
    gulp          = require('gulp'),
    livereload    = require('gulp-livereload'),
    postcss       = require('gulp-postcss'),
    sass          = require('gulp-sass'),
    sourcemaps    = require('gulp-sourcemaps'),
    uglify        = require('gulp-uglify-es').default

gulp.task('css', function (done) {
  gulp.src([
            'web/source/scss/baseline.scss',
            'web/source/scss/global.scss',
            'web/source/scss/**/**.scss'
          ])
      .pipe(sourcemaps.init())
      .pipe(sass().on('error', sass.logError))
      .pipe(postcss([autoprefixer({ browsers: 'last 2 versions' })]))
      .pipe(cssnano({ safe: true, colormin: false }))
      .pipe(concat('site.css'))
      .pipe(sourcemaps.write('../min'))
      .pipe(gulp.dest('web/min/'))
      .pipe(filter('**/*.css'))
      .pipe(livereload())
  done()
})

gulp.task('js', function (done) {
  gulp.src([
            'web/source/js/immediate.js',
            'web/source/js/**.js'
          ])
      .pipe(sourcemaps.init())
      .pipe(uglify())
      .pipe(concat('site.js'))
      .pipe(sourcemaps.write('../min'))
      .pipe(gulp.dest('web/min'))
      .pipe(livereload())
  done()
})

gulp.task('reload', function (done) {
  // Give citizen time to reload the module before refreshing
  setTimeout(function () {
    livereload.reload()
  }, 500)
  done()
})

gulp.task('watch', function (done) {
  livereload.listen()
  gulp.watch('web/source/scss/**/**.scss', gulp.parallel('css'))
  gulp.watch('web/source/js/**/**.js', gulp.parallel('js'))
  gulp.watch('app/patterns/**', gulp.parallel('reload'))
  gulp.watch('web/**/**.hbs', gulp.parallel('reload'))
  done()
})

gulp.task('default', gulp.parallel('watch'))
gulp.task('prod', gulp.parallel('js', 'css'))
