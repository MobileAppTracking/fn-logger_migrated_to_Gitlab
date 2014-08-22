application.directive('debugger', ['$log', '$timeout', function($log, $timeout) {
  'use strict';

  return {
    'templateUrl' : '/src/logger/debugger.html',
    'restrict'    : 'E',
    'transclude'  : true,
    'replace '    : true,
    'scope'       : true,
    'controller' : [
      '$scope', '$document',
      function ($scope, $document) {
        var hasLocalStorage = false;
        try { // hack for safari incognito
          localStorage.setItem("storage", "");
          localStorage.getItem("storage");
          localStorage.removeItem("storage");
          hasLocalStorage = true;
        } catch(err) {}

        var updateLogs = function() {
          $timeout(function() {
            var namespaces = _.contains($scope.activeNamespaces, '_all') ? null : $scope.activeNamespaces;
            var levels = _.contains($scope.activeLevels, '_all') ? null : $scope.activeLevels;
            var searchTerms = null;

            if ($scope.searchTerm) {
              searchTerms = $scope.searchTerm;
            }

            $scope.logs = $log.getLogs(namespaces, levels, searchTerms);

            if (hasLocalStorage) {
              localStorage.setItem('activeNamespaces', JSON.stringify($scope.activeNamespaces));
              localStorage.setItem('activeLevels', JSON.stringify($scope.activeLevels));
            }
          });
        };

        $scope.logs = [];
        $scope.activeNamespaces = ['_all'];
        $scope.activeLevels = ['_all'];

        $scope.namespaces = $log.getNamespaces();
        $scope.levels = $log.dbEnabled;

        if (hasLocalStorage) {
          try {
            $scope.activeLevels = JSON.parse(localStorage.getItem('activeLevels')) || $scope.activeLevels;
            $scope.activeNamespaces = JSON.parse(localStorage.getItem('activeNamespaces')) ||
                                        $scope.activeNamespaces;

            $scope.namespaces = _.without(_.union($scope.activeNamespaces, $scope.namespaces), '_all');
          } catch (e) {
            $scope.activeNamespaces = ['_all'];
            $scope.activeLevels = ['_all'];
          }
        }

        // if ($log.datastore) {
        //   $log.datastore.settings({
        //     'onInsert' : function() {
        //       $scope.namespaces = $log.getNamespaces();
        //       $scope.levels = $log.dbEnabled;
        //       updateLogs();

        //       $('#newLogIndicator')
        //         .removeClass()
        //         .addClass(this.level)
        //         .stop(true, true)
        //         .fadeIn('fast')
        //         .delay(750)
        //         .fadeOut();
        //     },
        //     'onUpdate' : function() {
        //       updateLogs();
        //     },
        //     'onRemove' : function() {
        //       updateLogs();
        //     }
        //   });
        // }

        $scope.clear = function() {
          $log.clear();
          updateLogs();
        };

        $scope.search = function() {
          updateLogs();
        };

        $scope.setActiveNamespace = function(namespace) {
          if (namespace == '_all') {
            $scope.activeNamespaces = ['_all'];
          } else {
            if (!_.contains($scope.activeNamespaces, namespace)) {
              $scope.activeNamespaces.push(namespace);
            } else {
              $scope.activeNamespaces = _.without($scope.activeNamespaces, namespace);
            }
            $scope.activeNamespaces = _.without($scope.activeNamespaces, '_all');
          }

          if ($scope.activeNamespaces.length === 0) {
            $scope.activeNamespaces = ['_all'];
          }
          updateLogs();
        };

        $scope.setActiveLevel = function(level) {
          if (level == '_all') {
            $scope.activeLevels = ['_all'];
          } else {
            if (!_.contains($scope.activeLevels, level)) {
              $scope.activeLevels.push(level);
            } else {
              $scope.activeLevels = _.without($scope.activeLevels, level);
            }
            $scope.activeLevels = _.without($scope.activeLevels, '_all');
          }

          if ($scope.activeLevels.length === 0) {
            $scope.activeLevels = ['_all'];
          }

          updateLogs();
        };

        $scope.toggleActive = function($event) {
          if ($event.target.nodeName.toLowerCase() != 'code' && $($event.target).parents('code').length === 0) {
            angular.element($event.currentTarget).toggleClass('active');
          }
        };

        $scope.namespaceClass = function(namespace) {
          if (_.contains($scope.activeNamespaces, namespace)) {
            return 'debugger-check';
          }
          return 'debugger-check-empty';
        };

        $scope.levelClass = function(level) {
          if (_.contains($scope.activeLevels, level)) {
            return 'active '+level;
          }
          return level;
        };

        updateLogs();


        /*
         * The following code is a naive approach to handing resizing. Feel free to clean it up or isolate it out.
         */

        // Setup events for resize drag handle
        var currentSize, resizeDebugger;
        var inDrag = false;
        var $element = $('#debugger');
        var height = 175;

        if (hasLocalStorage) {
          height = localStorage.getItem('debuggerHeight') || height;
        }
        if (height > $(window).height() - 50) {
          height = $(window).height() - 50;
        }
        resizeDebugger = function(newHeight) {
          $("body").css("padding-bottom", newHeight + "px");
          $element.height(newHeight);
          if (hasLocalStorage) {
            localStorage.setItem('debuggerHeight', newHeight);
          }
        };

        resizeDebugger(height);

        $element.find('.toggler').click(function() {
          if (!inDrag) {
            if ($element.height() > 8) {
              currentSize = $element.height();
              resizeDebugger(8);

            } else {
              resizeDebugger(currentSize || 200);
            }
          }
        });

        $document.on('mousedown', '.resizer', function(e) {
          e.preventDefault();

          var start = e.clientY || e.PageY,
              originalHeight = $element.height();

          $document.bind('mousemove', function(e) {
            inDrag = true;
            var newHeight = originalHeight + (start-(e.clientY || e.PageY));
            if (newHeight < 0) {
              $document.trigger('mouseup');
            }
            newHeight = newHeight > 8 ? newHeight : 8;
            resizeDebugger(newHeight);
          });

          $document.bind('mouseup', function() {
            setTimeout(function() {
              inDrag = false;
            }, 50);
            $document.unbind('mousemove');
            $document.unbind('mouseup');
          });
        });

        // Setup Namespace sidebar drag handle
        var $content = $('#debugger .content');
        var $sidebar = $('#debugger .sidebar');
        var sidebarWidth = 200;
        var setSidebarWidth = function(width) {
          $sidebar.width(width).css('margin-left', width * -1);
          $content.css('padding-left', width);
        };
        setSidebarWidth(sidebarWidth);

        $document.on('mousedown', '.sidebar-resize', function(e) {
          e.preventDefault();

          var start = e.clientX || e.PageX,
              originalWidth = $sidebar.width();

          $document.bind('mousemove', function(e) {
            inDrag = true;
            var newWidth = originalWidth + ((e.clientX || e.PageX)-start);
            if (newWidth < 0) {
              $document.trigger('mouseup');
            }
            newWidth = newWidth > 120 ? newWidth : 120;
            setSidebarWidth(newWidth);
          });

          $document.bind('mouseup', function() {
            setTimeout(function() {
              inDrag = false;
            }, 50);
            $document.unbind('mousemove');
            $document.unbind('mouseup');
          });
        });
      }
    ]
  };
}]);
