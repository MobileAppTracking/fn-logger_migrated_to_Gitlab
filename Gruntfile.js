/* global module, require */

module.exports = function(grunt) {
  'use strict';

  // Give a task execution summary at then end of the grunt run
  require('time-grunt')(grunt);

  // Load all grunt tasks matching the `grunt-*` pattern
  require('load-grunt-tasks')(grunt);

  var payloadFiles = [
    'src/fn.logger.js',
    'src/cycle.js',
    'src/logger/debugger.js',
    'fn.logger.templates.js',
  ];

  grunt.initConfig({
    jshintrc : grunt.file.readJSON('.jshintrc'),

    clean : {
      temp      : ['temp'],
      templates : ['fn.logger.templates.js']
    },

    cssmin : {
      main : {
        expand : true,
        src    : 'src/**/*.css',
        dest   : 'temp/',
        ext    : '.min.css'
      }
    },

    includereplace : {
      main : {
        options : {
          prefix      : '<!-- @@',
          suffix      : ' -->',
          includesDir : 'temp/src/',
          base        : '/temp/src/'
        },
        src  : 'src/logger/debugger.html',
        dest : 'temp/'
      }
    },

    htmlmin : {
      main : {
        options : {
          removeComments     : true,
          collapseWhitespace : true
        },
        files : {
          'temp/src/logger/debugger.html' : 'temp/src/logger/debugger.html'
        }
      }
    },

    ngtemplates : {
      app : {
        options:  {
          module  : 'fn.logger',
          url     :  function(url) {
            return url.replace('temp/src/', '/src/');
          }
        },
        src  : 'temp/src/**/*.html',
        dest : 'fn.logger.templates.js'
      }
    },

    uglify : {
      'build-minify' : {
        options : {
          mangle : {
            except : ['_']
          },
          compress : true,
          wrap     : true
        },
        files : {
          'fn.logger.min.js' : payloadFiles
        }

      },

      'build-source' : {
        options : {
          mangle   : false,
          beautify : true,
          wrap     : true,
          compress : false
        },
        files : {
          'fn.logger.js' : payloadFiles
        }
      }
    },

    watch: {
      all: {
        files: ['src/**/*'],
        tasks: ['default']
      }
    },

    karma : {
      source : {
        configFile : 'test/build.conf.js',
        singleRun  : true,
        reporters  : 'dots'
      },
      production : {
        configFile : 'test/minify.conf.js',
        singleRun  : true,
        reporters  : 'dots'
      }
    },

    jshint : {
      options : {
        'bitwise'     : true,
        'boss'        : true,
        'browser'     : true,
        'curly'       : true,
        'devel'       : true,
        'eqnull'      : true,
        'globals'     : '<%= jshintrc.globals %>',
        'indent'      : 2,
        'jquery'      : true,
        'latedef'     : true,
        'maxlen'      : 115,
        'noempty'     : true,
        'nonstandard' : true,
        'quotmark'    : 'single',
        'strict'      : true,
        'undef'       : true,
        'unused'      : true,
        'trailing'    : true,
        '-W015'       : true
      },
      all : ['src/**/*.js']
    }
  });

  grunt.registerTask('default', ['templates', 'uglify', 'clean']);
  grunt.registerTask('templates', ['clean', 'cssmin', 'includereplace', 'htmlmin', 'ngtemplates']);
  grunt.registerTask('test', ['templates', 'jshint', 'uglify', 'karma', 'clean']);
};
