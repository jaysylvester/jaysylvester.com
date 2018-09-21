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
    uglify        = require('gulp-uglify')

gulp.task('css', function () {
  return gulp.src(['web/source/scss/baseline.scss', 'web/source/scss/global.scss', 'web/source/scss/**/**.scss'])
             .pipe(sourcemaps.init())
             .pipe(sass().on('error', sass.logError))
             .pipe(postcss([autoprefixer({ browsers: 'last 2 versions' })]))
             .pipe(cssnano({ safe: true, colormin: false }))
             .pipe(concat('site.css'))
             .pipe(sourcemaps.write('../min'))
             .pipe(gulp.dest('web/min/'))
             .pipe(filter('**/*.css'))
             .pipe(livereload())
})

gulp.task('js', function () {
  return gulp.src(['web/source/js/lib/modernizr.js',
                   'web/source/js/site/immediate.js',
                   'web/source/js/site/**.js'
                  ])
             .pipe(sourcemaps.init())
             .pipe(uglify())
             .pipe(concat('min.js'))
             .pipe(sourcemaps.write(''))
             .pipe(gulp.dest('web/themes/default'))
             .pipe(livereload())
})

gulp.task('views', function () {
  livereload.reload()
  return
})

gulp.task('watch', function() {
  livereload.listen()
  gulp.watch('web/source/scss/**/**.scss', ['css'])
  gulp.watch('web/source/js/**/**.js', ['js'])
  gulp.watch('app/patterns/models/**.js', ['views'])
  gulp.watch('app/patterns/views/**/**.hbs', ['views'])
  gulp.watch('web/**/**.hbs', ['views'])
})

gulp.task('default', ['watch'])
gulp.task('prod', ['js', 'css'])