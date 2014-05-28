'use strict';

var gulp = require('gulp'),
    plugins = require('gulp-load-plugins')(),
    path = require('path'),
    fs = require('fs'),
    Q = require('q'),
    svgToPng = require('svg-to-png'),
    DirectoryEncoder = require('directory-encoder');

gulp.task('gulpicon', function () {
  var icons = path.join(__dirname, '/'),  // TODO: configure path
      src = path.join(icons, '/src/**/*'),
      dest = path.join(icons, '/dest/'),
      tmp = path.join(dest, '/tmp/'),
      pngs = path.join(dest, '/pngs/'),
      dataSvgCss = path.join(dest, '/icons.data.svg.css'),
      dataPngCss = path.join(dest, '/icons.data.png.css'),
      urlPngCss = path.join(dest, '/icons.fallback.css'),
      iconPrefix = 'icon-',
      deferred = Q.defer();

  gulp.src(dest, {read: false})  // Remove dest folder
    .pipe(plugins.clean())
    .on('end', function () {
      var pngFilter = plugins.filter('**/*.png');
      var svgFilter = plugins.filter('**/*.svg');
      gulp.src(src)
        .pipe(pngFilter) // Filter pngs
        .pipe(plugins.rename({prefix: iconPrefix})) // Add icon prefix
        .pipe(gulp.dest(pngs))  // Put them in pngs
        .pipe(pngFilter.restore())
        .pipe(svgFilter)  // Filter svgs
        .pipe(plugins.rename({prefix: iconPrefix})) // Add icon prefix
        .pipe(plugins.svgmin()) // Clean them
        .pipe(gulp.dest(tmp))  // Put them in tmp folder
        .on('end', function () {
          var svgToPngOpts = {
            defaultWidth: '400px',
            defaultHeight: '300px'
          };
          svgToPng.convert(tmp, pngs, svgToPngOpts)  // Convert svgs to pngs and put them in pngs folder
          .then(function (result, err) {
            if (err) {
              throw new Error(err);
            }
            var deDataConfig = {
              pngfolder: pngs,
              pngpath: './pngs/',  // TODO: configure path
              customselectors: {},
              template: path.resolve('./templates/gulpicon-styles.hbs'), // TODO: configure path
              noencodepng: false,
              prefix: '.'
            };
            var deUrlConfig = {
              pngfolder: pngs,
              pngpath: './pngs/', // TODO: configure path
              customselectors: {},
              template: path.resolve('./templates/gulpicon-styles.hbs'), // TODO: configure path
              noencodepng: true,
              prefix: '.'
            };
            var svgde = new DirectoryEncoder(tmp, dataSvgCss, deDataConfig),
                pngde = new DirectoryEncoder(pngs, dataPngCss, deDataConfig),
                pngdefall = new DirectoryEncoder(pngs, urlPngCss, deUrlConfig);

            console.log('Writing CSS');

            try {
              if (fs.existsSync(tmp)) {
                svgde.encode();
              }
              if (fs.existsSync(pngs)) {
                pngde.encode();
                pngdefall.encode();
              }
            } catch (e) {
              throw new Error(e);
            }

            if (fs.existsSync(tmp)) {
              console.log('Generating Preview');

              // generate preview
              var previewTemplate = path.join(__dirname, '/templates/gulpicon-preview.hbs'); // TODO: configure path
              var helper = require(path.join(__dirname, '/lib/', 'gulpicon-helper')); // TODO: configure path
              var previewhtml = 'preview.html';
              var cssPrefix = '.';
              var uglify = require('uglify-js');
              var loader = path.join(__dirname, '/lib/', 'gulpicon-loader.js'); // TODO: configure path
              var loaderMin = uglify.minify(loader).code;

              try {
                helper.createPreview(tmp, dest, '400px', '300px', loaderMin, previewhtml, cssPrefix, previewTemplate);
              } catch (er) {
                throw new Error(er);
              }
            }

            console.log('Cleaning up');
            gulp.src(tmp, {read: false}) // Clean tmp folder
            .pipe(plugins.clean())
            .on('end', function () {
              console.log('done');
              deferred.resolve();
            });
          });
        });
    });

  return deferred.promise;
});

gulp.task('watch', function () {
  gulp.watch(['./src/**'], ['gulpicon']);  // Watch icons/src/ folder
});

gulp.task('default', function () {
  gulp.start('watch');
});
