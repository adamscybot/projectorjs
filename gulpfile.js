var gulp = require('gulp'),
    sourcemaps = require('gulp-sourcemaps'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename'),
    minifyCSS = require('gulp-minify-css');

gulp.task('default', ['js', 'css']);

gulp.task('css', function() {
    gulp.src('./lib/css/projectorjs.css')
        .pipe(gulp.dest('./dist/css/'))
        .pipe(rename('projectorjs.min.css'))
        .pipe(minifyCSS())
        .pipe(gulp.dest('./dist/css/'));
});


gulp.task('js', function() {
    gulp.src('./lib/js/index.js')
        .pipe(rename('projector.js'))
        .pipe(gulp.dest('./dist/js/'))
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(uglify())
        .pipe(sourcemaps.write('./'))
        .pipe(rename('projector.min.js'))
        .pipe(gulp.dest('./dist/js/'));
});


gulp.task('watch', ['js', 'css'], function() {
    gulp.watch('./lib/js/**/*.js', ['js']);
    gulp.watch('./lib/css/**/*.js', ['css']);
});
