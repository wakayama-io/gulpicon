'use strict';

var gulp = require('gulp'),
    path = require('path');

gulp.task('watch', function () {
  // Watch src folder
  gulp.watch(['./src/**'], ['gulpicon']);
});

gulp.task('gulpicon', function () {
  var es = require('event-stream'),
      clean = require('gulp-clean'),
      filter = require('gulp-filter'),
      rename = require('gulp-rename'),
      svgToPng = require('svg-to-png'),
      svgmin = require('gulp-svgmin'),
      DirectoryEncoder = require('directory-encoder'),
      icons = path.join(__dirname, '/'),  // TODO: configure path
      src = path.join(icons, '/src/**/*'),
      dest = path.join(icons, '/dest/'),
      svgtmp = path.join(dest, '/svgtmp/'),
      pngtmp = path.join(dest, '/pngtmp/'),
      pngs = path.join(dest, '/pngs/'),
      dataSvgCss = path.join(dest, '/icons.data.svg.css'),
      dataPngCss = path.join(dest, '/icons.data.png.css'),
      urlPngCss = path.join(dest, '/icons.fallback.css'),
      iconPrefix = 'icon-';

  gulp.src(dest, {read: false})  // Remove dest folder
    .pipe(clean())
    .on ('end', function() {
      var pngFilter = filter('**/*.png');
      var svgFilter = filter('**/*.svg');
      es.concat(  // Combines the streams and ends only when all streams emitted end
        gulp.src(src)
          .pipe(pngFilter) // Filter pngs
          .pipe(rename({prefix: iconPrefix})) // Add icon prefix
          .pipe(gulp.dest(pngtmp))  // Put them in pngtmp
          .pipe(gulp.dest(pngs))  // And in pngs folder
          .pipe(pngFilter.restore())
          .pipe(svgFilter)  // Filter svgs
          .pipe(rename({prefix: iconPrefix})) // Add icon prefix
          .pipe(svgmin()) // Clean them
          .pipe(gulp.dest(svgtmp))  // Put them in svgtmp folder
      ).on ('end', function() {
        var svgToPngOpts = {
          defaultWidth: '400px',
          defaultHeight: '300px'
        };
        svgToPng.convert( svgtmp, pngs, svgToPngOpts )  // Convert svgs to pngs and put them in pngs folder
          .then( function( result , err ){
            if( err ){
              throw new Error( err );
            }
            var deDataConfig = {
              pngfolder: pngs,
              pngpath: './dest/pngs/',  // TODO: configure path
              customselectors: {},
              template: path.resolve('./templates/gulpicon-styles.hbs'), // TODO: configure path
              noencodepng: false,
              prefix: '.'
            };
            var deUrlConfig = {
              pngfolder: pngs,
              pngpath: './dest/pngs/', // TODO: configure path
              customselectors: {},
              template: path.resolve('./templates/gulpicon-styles.hbs'), // TODO: configure path
              noencodepng: true,
              prefix: '.'
            };
            var svgde = new DirectoryEncoder(svgtmp, dataSvgCss, deDataConfig),
              pngde = new DirectoryEncoder(pngtmp, dataPngCss, deDataConfig),
              pngdefall = new DirectoryEncoder(pngs, urlPngCss, deUrlConfig);

            console.log("Writing CSS");

            try {
              svgde.encode();
              pngde.encode();
              pngdefall.encode();
            } catch( e ){
              throw new Error( e );
            }

            console.log("Generating Preview");

            // generate preview
            var previewTemplate = path.join(__dirname,'/templates/gulpicon-preview.hbs'); // TODO: configure path
            var helper = require( path.join( __dirname, '/lib/', 'gulpicon-helper' ) ); // TODO: configure path
            var previewhtml = 'preview.html';
            var cssPrefix = '.';
            var uglify = require( 'uglify-js' );
            var loader = path.join( __dirname, '/lib/', 'gulpicon-loader.js' ); // TODO: configure path
            var loaderMin = uglify.minify( loader ).code;

            try {
              helper.createPreview(svgtmp, dest, '400px', '300px', loaderMin, previewhtml, cssPrefix, previewTemplate);
            } catch(er) {
              throw new Error( er );
            }

            es.concat(
              gulp.src(svgtmp, {read: false}) // Clean tmp folders
                .pipe(clean()),
              gulp.src(pngtmp, {read: false})
                .pipe(clean())
            ).on('end', function(){
              console.log('done');
            });
        });
      });
    });
});

gulp.task('default', function () {
  gulp.start('watch');
});
