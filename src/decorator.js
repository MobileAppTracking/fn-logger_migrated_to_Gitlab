/**
 * @method $log
 * Enhance native AngularJS $log service, now with namespaces.
 *
 * Overrides default angular behavior - adds the database for storing, querying and sorting logs
 * You can enabled only certain log levels by setting `$log.consoleEnabled` and `$log.dbEnabled`.
 * They both contain an array of what log levels will be stored/reported. Possible values are
 * `['error', 'info', 'warn', 'log']`.
 *
 * Also injects `$log` as the default implementation for console.{log|warn|info|error} methods
 *
 * The `logDB` provider provides a service for logs storage as default
 * You can override the default storage provider - uses other databases (e.g. TaffyDB) for storage mechanism
 *
 * The `<debugger>` directive provides a sample interface for retrieving and displaying information from `$log`.
 *
 * Example:
 *
 *     $log.warn('my-namespace', 'something happened', {additonalData: 'here'}, ['or', 'here']);
 *     $log.error('api', 'Method foo is not defined', {request: {}});
 *
 *     // Calls without a namespace will be categorized in the 'default' namespace
 *     $log.log('simple');
 *
 *     // Calls to console.{log|warn|info|error} will be logged to the console namespace
 *     console.log('hello world');
 *
 *
 */
angular.module('fn.logger').config(['$provide', 'logDBProvider', function($provide, logDBProvider) {
  'use strict';

  var $sce;
  $provide.decorator('$sce', ['$delegate', function($delegate) {
    return $sce = $delegate;
  }]);

  $provide.decorator('$log', ['$delegate', function($delegate) {
    var console = window.console || {};
    var _old = {
      'error' : console.error,
      'info'  : console.info,
      'warn'  : console.warn,
      'log'   : console.log
    };

    var logLevels = ['error', 'info', 'warn', 'log'];
    var _id = 0;
    var generateId = function () {
      return _id++;
    };

    $delegate.interceptConsole = function interceptConsole() {
      _.each(logLevels, function(level) {
        console[level] = function fnConsoleLogger() {
          $delegate[level].apply($delegate, _.union(['console'], _.toArray(arguments)));
        };
      });
    };

    $delegate.stopInterceptingConsole = function stopInterceptingConsole() {
      _.each(logLevels, function(level) {
        console[level] = function() {
          _old[level].apply(console, arguments);
        };
      });
    };

    $delegate.consoleEnabled = _.clone(logLevels);
    $delegate.dbEnabled = _.clone(logLevels);
    $delegate.datastore = logDBProvider;

    var formatError = function(arg) {
      if (arg instanceof Error) {
        if (arg.stack) {
          if (arg.message && arg.stack.indexOf(arg.message) === -1) {
            return 'Error: ' + arg.message + '\n' + arg.stack;
          } else {
            return arg.stack;
          }
        } else if (arg.sourceURL) {
          return arg.message + '\n' + arg.sourceURL + ':' + arg.line;
        }
      }

      if (typeof arg == 'string') {
        return arg.replace(/\\n/g, '\n');
      }

      return arg;
    };

    var formatShortError = function(arg) {
      if (arg instanceof Error) {
        if (arg.stack) {
          var stack = arg.stack.split('\n');
          if (!arg.message || (arg.message && stack[0].indexOf(arg.message) !== -1)) {
            return stack[0];
          }
          return arg.message;
        } else if (arg.sourceURL) {
          return arg.message + '\n' + arg.sourceURL + ':' + arg.line;
        }
      }
      return arg;
    };

    var jsonHelper = {
      key : '<span class=json-key>',
      val : '<span class=json-value>',
      str : '<span class=json-string>',

      replacer : function(match, indent, key, val, end) {
        var ret = indent || '';
        if (key) {
          ret = ret + jsonHelper.key + key.replace(/[": ]/g, '') + '</span>: ';
        }
        if (val) {
          ret = ret + (val[0] == '"' ? jsonHelper.str : jsonHelper.val) + val + '</span>';
        }
        return ret + (end || '');
      },

      prettyPrint : function(obj) {
        var jsonLine = /^( *)("[\w]+": )?("[^"]*"|[\w.+-]*)?([,[{])?$/mg,
            jsonString = JSON.stringify(JSON.decycle(obj), null, 2);

        if (!_.isString(jsonString)) {
          return 'undefined';
        }

        return jsonString
          .replace(/\\n/g, '\n')
          .replace(/&/g, '&amp;').replace(/\\"/g, '&quot;')
          .replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(jsonLine, jsonHelper.replacer);
      }
    };

    var processInsertData = function(unprocessed) {
      var data = [];

      _(unprocessed).each(function(arg) {
        var insert;
        if (arg instanceof jQuery) {
          insert = {
            data : arg.html(),
            type : 'html'
          };
        } else {
          insert = {
            data : jsonHelper.prettyPrint(arg),
            type : 'code'
          };
        }
        if ($sce) {
          insert.data = $sce.trustAsHtml(insert.data);
        }
        data.push(insert);
      });

      return data;
    };

    _.each(logLevels, function(level) {
      $delegate[level] = function fnLogger(namespace, message) {
        var args = _.toArray(arguments);
        var hasjQuery = false;

        if (_.isUndefined(message)) {
          args[1] = message = namespace;
          args[0] = namespace = 'default';
        }

        _.each(args, function(arg, key) {
          if (key === 1 && arg instanceof Error) {
            args[key] = message = formatShortError(arg);
            args.push(formatError(arg));
          } else {
            hasjQuery = arg instanceof jQuery ? true : hasjQuery;
            args[key] = formatError(arg);
          }
        });


        if (_.isObject(message)) {
          message = formatError(JSON.stringify(JSON.decycle(message)));
        }

        if (_.contains($delegate.consoleEnabled, level)) {
          var logFn = _old[level] || _old.log || angular.noop;
          var logArgs;

          if (logFn.apply) {
            logArgs = _.clone(args);
            if (hasjQuery) {
              _.each(logArgs, function(val, key) {
                if (val instanceof jQuery) {
                  var text = val.text().replace(/\n^\s*\n/gm, '\n');
                  logArgs[key] = text.length > 80 ? text.slice(0, 80) + '...' : text;
                }
              });
            }

            // default and console are auto applied namespaces don't send them to the console
            if (_(['default', 'console']).contains(namespace)) {
              logArgs = logArgs.splice(1);
            }
            logFn.apply(console, logArgs);
          }
        }

        if (_.contains($delegate.dbEnabled, level)) {
          if (_.isNull($delegate.datastore)) {
            return;
          }

          args = args.splice(2);

          var insert = {
            'id'        : generateId(),
            'namespace' : namespace,
            'level'     : level,
            'time'      : new Date(),
            'message'   : message
          };

          var insertData = _.clone(insert);
          insertData.extra = processInsertData(args);

          $delegate.datastore.create(insertData);

          insert.data = args;
          return insert;
        }
      };
    });

    $delegate.update = function(payload) {
      if (_.isNull($delegate.datastore) ||
          !_.has(payload, 'level') ||
          !_.has(payload, 'id') ||
          !_.contains($delegate.dbEnabled, payload.level)) {
        return;
      }

      payload.time = new Date();
      payload.extra = processInsertData(payload.data);

      $delegate.datastore.update(payload.id, payload);
    };

    $delegate.clear = function() {
      if (_.isNull($delegate.datastore)) {
        return;
      }

      $delegate.datastore.delete();
    };

    $delegate.getNamespaces = function() {
      if ($delegate.datastore == null) {
        return [];
      }

      return $delegate.datastore.getNameSpaces();
    };

    $delegate.getLogger = function(namespace) {
      var customLogger = {};
      _.each(['error', 'info', 'warn', 'log'], function(level) {
        customLogger[level] = function() {
          var args = [namespace].concat([].splice.call(arguments,0));
          $delegate[level].apply($delegate, args);
        };
      });

      return customLogger;
    };

    $delegate.getLogs = function(namespaces, levels, searchTerms) {
      var query = {};

      if (!_.isEmpty(namespaces)) {
        query.namespace = namespaces;
      }

      if (!_.isEmpty(levels)) {
        query.level = levels;
      }

      if (!_.isEmpty(searchTerms)) {
        query.message = searchTerms;
      }

      var rows = $delegate.datastore.read(query);
      return rows;
    };

    $delegate.interceptConsole();
    window.$log = $delegate;

    return $delegate;
  }]);
}]);
