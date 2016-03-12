var gulp = require('gulp')
var gutil = require('gulp-util')
var source = require('vinyl-source-stream')
var browserify = require('browserify')

gulp.task('make', function() {
    return (
        browserify('./src/main.js')
        .bundle()
        .on('error', function(e) {
            gutil.log(e)
        })
        .pipe(source('sim-engine.js'))
        .pipe(gulp.dest('../static/js'))
    )
})

gulp.task('watch', function() {
    gulp.watch('src/**/*.js', ['make'])
})
