'use strict';

import gulp from 'gulp';
import sourcemaps from 'gulp-sourcemaps';
import babel from "gulp-babel";

gulp.task('default', () => {
  return gulp.src('src/**/*.js')
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(gulp.dest('lib'));
});
