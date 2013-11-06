/* global module */

module.exports = function(config) {
  'use strict';

  config.set({
    frameworks     : ['jasmine'],
    basePath       : '../',
    autoWatch      : true,
    browsers       : ['PhantomJS'],
    reporters      : ['progress'],
    captureTimeout : 2500,

    files: [
      //Testing fixtures
      'bower_components/chai/chai.js',
      'node_modules/chai-spies/chai-spies.js',
      'test/chai-starter.js',

      //Dependencies
      'bower_components/jquery/jquery.js',
      'bower_components/angular/angular.js',
      'bower_components/angular-mocks/angular-mocks.js',
      'bower_components/angular-sanitize/angular-sanitize.js',
      'bower_components/lodash/dist/lodash.underscore.js',
      'bower_components/taffydb/taffy-min.js',

      //Project source
      'fn-logger.js',

      // All Tests
      'test/unit/*.js'
    ]
  });
};
