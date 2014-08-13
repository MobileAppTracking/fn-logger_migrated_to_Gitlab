(function(exports, global) {
    global["true"] = exports;
    var application = angular.module("fn.logger", []);
    application.config([ "$provide", function($provide) {
        "use strict";
        var $sce;
        $provide.decorator("$sce", [ "$delegate", function($delegate) {
            return $sce = $delegate;
        } ]);
        $provide.decorator("$log", [ "$delegate", function($delegate) {
            var console = window.console || {};
            var _old = {
                error: console.error,
                info: console.info,
                warn: console.warn,
                log: console.log
            };
            var _id = 0;
            var generateId = function() {
                return _id++;
            };
            $delegate.interceptConsole = function interceptConsole() {
                _.each([ "error", "info", "warn", "log" ], function(level) {
                    console[level] = function fnConsoleLogger() {
                        $delegate[level].apply($delegate, _.union([ "console" ], _.toArray(arguments)));
                    };
                });
            };
            $delegate.stopInterceptingConsole = function stopInterceptingConsole() {
                _.each([ "error", "info", "warn", "log" ], function(level) {
                    console[level] = function() {
                        _old[level].apply(console, arguments);
                    };
                });
            };
            $delegate.consoleEnabled = [ "error", "info", "warn", "log" ];
            $delegate.dbEnabled = [ "error", "info", "warn", "log" ];
            $delegate.datastore = null;
            if (typeof TAFFY == "function") {
                $delegate.datastore = TAFFY();
            } else {
                _old.log.apply(console, [ "TaffyDb logging disabled because TAFFY not loaded" ]);
            }
            var formatError = function(arg) {
                if (arg instanceof Error) {
                    if (arg.stack) {
                        if (arg.message && arg.stack.indexOf(arg.message) === -1) {
                            return "Error: " + arg.message + "\n" + arg.stack;
                        } else {
                            return arg.stack;
                        }
                    } else if (arg.sourceURL) {
                        return arg.message + "\n" + arg.sourceURL + ":" + arg.line;
                    }
                }
                if (typeof arg == "string") {
                    return arg.replace(/\\n/g, "\n");
                }
                return arg;
            };
            var formatShortError = function(arg) {
                if (arg instanceof Error) {
                    if (arg.stack) {
                        var stack = arg.stack.split("\n");
                        if (!arg.message || arg.message && stack[0].indexOf(arg.message) !== -1) {
                            return stack[0];
                        }
                        return arg.message;
                    } else if (arg.sourceURL) {
                        return arg.message + "\n" + arg.sourceURL + ":" + arg.line;
                    }
                }
                return arg;
            };
            var jsonHelper = {
                key: "<span class=json-key>",
                val: "<span class=json-value>",
                str: "<span class=json-string>",
                replacer: function(match, indent, key, val, end) {
                    var ret = indent || "";
                    if (key) {
                        ret = ret + jsonHelper.key + key.replace(/[": ]/g, "") + "</span>: ";
                    }
                    if (val) {
                        ret = ret + (val[0] == '"' ? jsonHelper.str : jsonHelper.val) + val + "</span>";
                    }
                    return ret + (end || "");
                },
                prettyPrint: function(obj) {
                    var jsonLine = /^( *)("[\w]+": )?("[^"]*"|[\w.+-]*)?([,[{])?$/gm, jsonString = JSON.stringify(JSON.decycle(obj), null, 2);
                    if (!_.isString(jsonString)) {
                        return "undefined";
                    }
                    return jsonString.replace(/\\n/g, "\n").replace(/&/g, "&amp;").replace(/\\"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(jsonLine, jsonHelper.replacer);
                }
            };
            var processInsertData = function(unprocessed) {
                var data = [];
                _(unprocessed).each(function(arg) {
                    var insert;
                    if (arg instanceof jQuery) {
                        insert = {
                            data: arg.html(),
                            type: "html"
                        };
                    } else {
                        insert = {
                            data: jsonHelper.prettyPrint(arg),
                            type: "code"
                        };
                    }
                    if ($sce) {
                        insert.data = $sce.trustAsHtml(insert.data);
                    }
                    data.push(insert);
                });
                return data;
            };
            _.each([ "error", "info", "warn", "log" ], function(level) {
                $delegate[level] = function fnLogger(namespace, message) {
                    var args = _.toArray(arguments);
                    var hasjQuery = false;
                    if (_.isUndefined(message)) {
                        args[1] = message = namespace;
                        args[0] = namespace = "default";
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
                                        var text = val.text().replace(/\n^\s*\n/gm, "\n");
                                        logArgs[key] = text.length > 80 ? text.slice(0, 80) + "..." : text;
                                    }
                                });
                            }
                            if (_([ "default", "console" ]).contains(namespace)) {
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
                            id: generateId(),
                            namespace: namespace,
                            level: level,
                            time: new Date(),
                            message: message
                        };
                        var insertData = _.clone(insert);
                        insertData.extra = processInsertData(args);
                        $delegate.datastore.insert(insertData);
                        insert.data = args;
                        return insert;
                    }
                };
            });
            $delegate.update = function(payload) {
                if (_.isNull($delegate.datastore) || !_.has(payload, "level") || !_.has(payload, "id") || !_.contains($delegate.dbEnabled, payload.level)) {
                    return;
                }
                payload.time = new Date();
                payload.extra = processInsertData(payload.data);
                $delegate.datastore({
                    id: payload.id
                }).update(payload);
            };
            $delegate.clear = function(namespaces, levels) {
                if (_.isNull($delegate.datastore)) {
                    return;
                }
                var query = {};
                if (!_.isEmpty(namespaces)) {
                    query.namespace = namespaces;
                }
                if (!_.isEmpty(levels)) {
                    query.level = levels;
                }
                $delegate.datastore(query).remove();
            };
            $delegate.search = function(namespaces, levels, message) {
                if (_.isNull($delegate.datastore)) {
                    return;
                }
                var query = {};
                if (!_.isEmpty(namespaces)) {
                    query.namespace = namespaces;
                }
                if (!_.isEmpty(levels)) {
                    query.level = levels;
                }
                var rows = $delegate.datastore(query).filter({
                    message: {
                        likenocase: message
                    }
                }).get();
                return rows;
            };
            $delegate.getNamespaces = function() {
                if ($delegate.datastore == null) {
                    return [];
                }
                return $delegate.datastore().distinct("namespace");
            };
            $delegate.getLogger = function(namespace) {
                var customLogger = {};
                _.each([ "error", "info", "warn", "log" ], function(level) {
                    customLogger[level] = function() {
                        var args = [ namespace ].concat([].splice.call(arguments, 0));
                        $delegate[level].apply($delegate, args);
                    };
                });
                return customLogger;
            };
            $delegate.getLogs = function(namespaces, levels) {
                if (typeof TAFFY != "function") {
                    throw new Error("Cannot get logs; TaffyDB logging disabled because TAFFY not loaded");
                }
                var query = {};
                if (!_.isEmpty(namespaces)) {
                    query.namespace = namespaces;
                }
                if (!_.isEmpty(levels)) {
                    query.level = levels;
                }
                var rows = $delegate.datastore(query).order("time desc").get();
                return rows;
            };
            $delegate.interceptConsole();
            window.$log = $delegate;
            return $delegate;
        } ]);
    } ]);
    if (typeof JSON.decycle !== "function") {
        JSON.decycle = function decycle(object) {
            "use strict";
            var objects = [], paths = [];
            return function derez(value, path) {
                var i, name, nu;
                if (typeof value === "object" && value !== null && !(value instanceof Boolean) && !(value instanceof Date) && !(value instanceof Number) && !(value instanceof RegExp) && !(value instanceof String)) {
                    for (i = 0; i < objects.length; i += 1) {
                        if (objects[i] === value) {
                            return {
                                $ref: paths[i]
                            };
                        }
                    }
                    objects.push(value);
                    paths.push(path);
                    if (Object.prototype.toString.apply(value) === "[object Array]") {
                        nu = [];
                        for (i = 0; i < value.length; i += 1) {
                            nu[i] = derez(value[i], path + "[" + i + "]");
                        }
                    } else {
                        nu = {};
                        for (name in value) {
                            if (Object.prototype.hasOwnProperty.call(value, name)) {
                                nu[name] = derez(value[name], path + "[" + JSON.stringify(name) + "]");
                            }
                        }
                    }
                    return nu;
                }
                return value;
            }(object, "$");
        };
    }
    if (typeof JSON.retrocycle !== "function") {
        JSON.retrocycle = function retrocycle($) {
            "use strict";
            var px = /^\$(?:\[(?:\d+|\"(?:[^\\\"\u0000-\u001f]|\\([\\\"\/bfnrt]|u[0-9a-zA-Z]{4}))*\")\])*$/;
            (function rez(value) {
                var i, item, name, path;
                if (value && typeof value === "object") {
                    if (Object.prototype.toString.apply(value) === "[object Array]") {
                        for (i = 0; i < value.length; i += 1) {
                            item = value[i];
                            if (item && typeof item === "object") {
                                path = item.$ref;
                                if (typeof path === "string" && px.test(path)) {
                                    value[i] = eval(path);
                                } else {
                                    rez(item);
                                }
                            }
                        }
                    } else {
                        for (name in value) {
                            if (typeof value[name] === "object") {
                                item = value[name];
                                if (item) {
                                    path = item.$ref;
                                    if (typeof path === "string" && px.test(path)) {
                                        value[name] = eval(path);
                                    } else {
                                        rez(item);
                                    }
                                }
                            }
                        }
                    }
                }
            })($);
            return $;
        };
    }
    application.directive("debugger", [ "$log", "$timeout", function($log, $timeout) {
        "use strict";
        return {
            templateUrl: "/src/logger/debugger.html",
            restrict: "E",
            transclude: true,
            "replace ": true,
            scope: true,
            controller: [ "$scope", "$document", function($scope, $document) {
                var hasLocalStorage = false;
                try {
                    localStorage.setItem("storage", "");
                    localStorage.getItem("storage");
                    localStorage.removeItem("storage");
                    hasLocalStorage = true;
                } catch (err) {}
                var updateLogs = function() {
                    $timeout(function() {
                        var namespaces = _.contains($scope.activeNamespaces, "_all") ? null : $scope.activeNamespaces;
                        var levels = _.contains($scope.activeLevels, "_all") ? null : $scope.activeLevels;
                        $scope.logs = $log.getLogs(namespaces, levels);
                        if ($scope.currentSearch) {
                            $scope.logs = $log.search(namespaces, levels, $scope.currentSearch);
                        }
                        if (hasLocalStorage) {
                            localStorage.setItem("activeNamespaces", JSON.stringify($scope.activeNamespaces));
                            localStorage.setItem("activeLevels", JSON.stringify($scope.activeLevels));
                        }
                    });
                };
                $scope.logs = [];
                $scope.activeNamespaces = [ "_all" ];
                $scope.activeLevels = [ "_all" ];
                $scope.namespaces = $log.getNamespaces();
                $scope.levels = $log.dbEnabled;
                if (hasLocalStorage) {
                    try {
                        $scope.activeLevels = JSON.parse(localStorage.getItem("activeLevels")) || $scope.activeLevels;
                        $scope.activeNamespaces = JSON.parse(localStorage.getItem("activeNamespaces")) || $scope.activeNamespaces;
                        $scope.namespaces = _.without(_.union($scope.activeNamespaces, $scope.namespaces), "_all");
                    } catch (e) {
                        $scope.activeNamespaces = [ "_all" ];
                        $scope.activeLevels = [ "_all" ];
                    }
                }
                if ($log.datastore) {
                    $log.datastore.settings({
                        onInsert: function() {
                            $scope.namespaces = $log.getNamespaces();
                            $scope.levels = $log.dbEnabled;
                            updateLogs();
                            $("#newLogIndicator").removeClass().addClass(this.level).stop(true, true).fadeIn("fast").delay(750).fadeOut();
                        },
                        onUpdate: function() {
                            updateLogs();
                        },
                        onRemove: function() {
                            updateLogs();
                        }
                    });
                }
                $scope.clear = function() {
                    var namespaces = _.contains($scope.activeNamespaces, "_all") ? null : $scope.activeNamespaces;
                    var levels = _.contains($scope.activeLevels, "_all") ? null : $scope.activeLevels;
                    $log.clear(namespaces, levels);
                };
                $scope.search = function(message) {
                    $scope.currentSearch = message;
                    var namespaces = _.contains($scope.activeNamespaces, "_all") ? null : $scope.activeNamespaces;
                    var levels = _.contains($scope.activeLevels, "_all") ? null : $scope.activeLevels;
                    $scope.logs = $log.search(namespaces, levels, message);
                };
                $scope.setActiveNamespace = function(namespace) {
                    if (namespace == "_all") {
                        $scope.activeNamespaces = [ "_all" ];
                    } else {
                        if (!_.contains($scope.activeNamespaces, namespace)) {
                            $scope.activeNamespaces.push(namespace);
                        } else {
                            $scope.activeNamespaces = _.without($scope.activeNamespaces, namespace);
                        }
                        $scope.activeNamespaces = _.without($scope.activeNamespaces, "_all");
                    }
                    if ($scope.activeNamespaces.length === 0) {
                        $scope.activeNamespaces = [ "_all" ];
                    }
                    updateLogs();
                };
                $scope.setActiveLevel = function(level) {
                    if (level == "_all") {
                        $scope.activeLevels = [ "_all" ];
                    } else {
                        if (!_.contains($scope.activeLevels, level)) {
                            $scope.activeLevels.push(level);
                        } else {
                            $scope.activeLevels = _.without($scope.activeLevels, level);
                        }
                        $scope.activeLevels = _.without($scope.activeLevels, "_all");
                    }
                    if ($scope.activeLevels.length === 0) {
                        $scope.activeLevels = [ "_all" ];
                    }
                    updateLogs();
                };
                $scope.toggleActive = function($event) {
                    if ($event.target.nodeName.toLowerCase() != "code" && $($event.target).parents("code").length === 0) {
                        angular.element($event.currentTarget).toggleClass("active");
                    }
                };
                $scope.namespaceClass = function(namespace) {
                    if (_.contains($scope.activeNamespaces, namespace)) {
                        return "debugger-check";
                    }
                    return "debugger-check-empty";
                };
                $scope.levelClass = function(level) {
                    if (_.contains($scope.activeLevels, level)) {
                        return "active " + level;
                    }
                    return level;
                };
                updateLogs();
                var currentSize, resizeDebugger;
                var inDrag = false;
                var $element = $("#debugger");
                var height = 175;
                if (hasLocalStorage) {
                    height = localStorage.getItem("debuggerHeight") || height;
                }
                if (height > $(window).height() - 50) {
                    height = $(window).height() - 50;
                }
                resizeDebugger = function(newHeight) {
                    $("body").css("padding-bottom", newHeight + "px");
                    $element.height(newHeight);
                    if (hasLocalStorage) {
                        localStorage.setItem("debuggerHeight", newHeight);
                    }
                };
                resizeDebugger(height);
                $element.find(".toggler").click(function() {
                    if (!inDrag) {
                        if ($element.height() > 8) {
                            currentSize = $element.height();
                            resizeDebugger(8);
                        } else {
                            resizeDebugger(currentSize || 200);
                        }
                    }
                });
                $document.on("mousedown", ".resizer", function(e) {
                    e.preventDefault();
                    var start = e.clientY || e.PageY, originalHeight = $element.height();
                    $document.bind("mousemove", function(e) {
                        inDrag = true;
                        var newHeight = originalHeight + (start - (e.clientY || e.PageY));
                        if (newHeight < 0) {
                            $document.trigger("mouseup");
                        }
                        newHeight = newHeight > 8 ? newHeight : 8;
                        resizeDebugger(newHeight);
                    });
                    $document.bind("mouseup", function() {
                        setTimeout(function() {
                            inDrag = false;
                        }, 50);
                        $document.unbind("mousemove");
                        $document.unbind("mouseup");
                    });
                });
                var $content = $("#debugger .content");
                var $sidebar = $("#debugger .sidebar");
                var sidebarWidth = 200;
                var setSidebarWidth = function(width) {
                    $sidebar.width(width).css("margin-left", width * -1);
                    $content.css("padding-left", width);
                };
                setSidebarWidth(sidebarWidth);
                $document.on("mousedown", ".sidebar-resize", function(e) {
                    e.preventDefault();
                    var start = e.clientX || e.PageX, originalWidth = $sidebar.width();
                    $document.bind("mousemove", function(e) {
                        inDrag = true;
                        var newWidth = originalWidth + ((e.clientX || e.PageX) - start);
                        if (newWidth < 0) {
                            $document.trigger("mouseup");
                        }
                        newWidth = newWidth > 120 ? newWidth : 120;
                        setSidebarWidth(newWidth);
                    });
                    $document.bind("mouseup", function() {
                        setTimeout(function() {
                            inDrag = false;
                        }, 50);
                        $document.unbind("mousemove");
                        $document.unbind("mouseup");
                    });
                });
            } ]
        };
    } ]);
    angular.module("fn.logger").run([ "$templateCache", function($templateCache) {
        "use strict";
        $templateCache.put("/src/logger/debugger.html", '<div id="debugger"><div class="resizer toggler"><span id="newLogIndicator"></span></div><div class="content"><div class="sidebar"><h3>Namespaces</h3><ul><li ng-click="setActiveNamespace(\'_all\')"><i class="{{namespaceClass(\'_all\')}}"></i> All Namespaces</li><li ng-repeat="namespace in namespaces" ng-click="setActiveNamespace(namespace)"><i class="{{namespaceClass(namespace)}}"></i> {{namespace}}</li></ul><div class="sidebar-resize"></div></div><ul class="level-filter"><li ng-click="setActiveLevel(\'_all\')" class="{{levelClass(\'_all\')}}">All</li><li ng-repeat="level in levels" ng-click="setActiveLevel(level)" class="{{levelClass(level)}}">{{level}}</li><li ng-click="clear()" class="clear-data">Clear</li><li class="search-data">Search<input type="text" ng-keyup="search(message)" ng-model="message"></li></ul><ul class="logs"><li bindonce="" ng-repeat="log in logs" ng-click="toggleActive($event)" ng-class="{expandable : log.extra.length > 0}"><span class="level" ng-class="log.level" ng-bind="log.level"></span> <span class="time" ng-bind="log.time|date:\'mediumTime\'"></span> <span class="view-more" ng-show="log.extra.length"><span class="more">View More</span> <span class="less">View Less</span> <span class="disclosure-arrow">&#9663;</span></span> <span class="namespace" ng-bind="log.namespace"></span> <span class="message" ng-bind="log.message"></span><br style="clear: both"><code ng-repeat="data in log.extra" ng-class="{only_child : log.extra.length == 1 || ($index == log.extra.length-1 && $index % 2 == 0)}" ng-bind-html="data.data" class="{{data.type}}"></code></li></ul></div></div><style type="text/css">#debugger{-webkit-box-shadow:0 -3px 4px 0 rgba(0,0,0,.3);-moz-box-shadow:0 -3px 4px 0 rgba(0,0,0,.3);box-shadow:0 -3px 4px 0 rgba(0,0,0,.3);-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;background:rgba(255,255,255,.9);border-top:1px solid #888;bottom:0;height:175px;left:0;overflow:hidden;padding:10px 0 0;position:fixed;width:100%;z-index:9997}#debugger .error{background:#BA322E}#debugger .info{background:#2986C4}#debugger .warn{background:#ED9C24}#debugger .log{background:#8AC334}#debugger div,#debugger ul,#debugger li,#debugger h3,#debugger code,#debugger span{margin:0;padding:0;font-size:13px;-moz-box-sizing:border-box;-webkit-box-sizing:border-box;box-sizing:border-box}#debugger h3{text-rendering:optimizeLegibility;line-height:1.4}#debugger ul{list-style-type:none;line-height:1.6}#debugger code{background-color:#f5f5f5;border:1px solid rgba(0,0,0,.15);-moz-border-radius:4px;-webkit-border-radius:4px;border-radius:4px;color:#555;cursor:default;font-family:Consolas,"Liberation Mono",Courier,monospace;font-size:10px;line-height:11px;margin:10px 2% 0 0;padding:8px;white-space:pre;white-space:pre-wrap;width:49%;word-break:break-all;word-wrap:break-word;vertical-align:top}#debugger code.html{font-family:inherit;color:inherit}#debugger code:nth-child(2n){margin-right:0}#debugger code.only_child{width:100%;margin-right:0}#debugger #newLogIndicator{width:12px;height:12px;float:right;display:inline-block;border:1px solid rgba(0,0,0,0);-moz-border-radius:6px;-webkit-border-radius:6px;border-radius:6px;top:6px;position:relative;right:6px;-webkit-filter:blur(1px)}#debugger #newLogIndicator.log{border:solid 1px rgba(138,195,52,.85)}#debugger #newLogIndicator.warn{border:solid 1px rgba(237,156,36,.85)}#debugger #newLogIndicator.info{border:solid 1px rgba(82,156,207,.85)}#debugger #newLogIndicator.error{border:solid 1px rgba(237,69,38,.85)}#debugger .resizer{background-position:center;background-repeat:no-repeat;background-image:url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABsAAAAFCAMAAACD1meMAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAAGUExURbu7u////3iwjPUAAAACdFJOU/8A5bcwSgAAABRJREFUeNpiYMADGHEDBhroAwgwAA9QADeT0qnSAAAAAElFTkSuQmCC\');cursor:ns-resize;height:15px;margin:-13px auto 8px auto;z-index:9999}#debugger .sidebar{background:#E0DFDF;border-right:solid 1px #a6aab3;height:100%;overflow:scroll;padding:12px 0;position:relative;width:200px;float:left;margin-left:-200px;margin-top:-1px;border-top:solid 1px #B6B5B5}#debugger .sidebar-resize{display:inline-block;height:100%;position:absolute;top:0;right:0;cursor:ew-resize;width:4px}#debugger .sidebar h3{color:#535353;text-transform:uppercase;text-shadow:0 1px 0 #eceff6;font-size:14px;padding:0 12px 8px}#debugger .sidebar li:hover{color:#fff;text-shadow:0 1px #52315F;background:#89559C}#debugger .sidebar li{color:#4C4B4B;text-shadow:0 1px 0 #e8ebf0;text-transform:capitalize;padding:6px 12px;cursor:pointer}#debugger .sidebar li i{font-size:115%}#debugger .content{padding:0 0 0 200px;clear:right;position:relative;width:100%;height:100%;right:auto;float:left;background:#f4f4f4;border-top:solid 1px #B6B5B5}#debugger .logs{padding:0 14px 40px;height:100%;overflow-y:scroll;overflow-x:hidden;position:relative;margin-bottom:30px}#debugger .logs li{border-bottom:solid 1px #bbb;margin-bottom:8px;padding-bottom:8px;border-radius:4px;border:solid 1px #c8c8c8;background:#fefefe;box-shadow:0 0 5px 0 #dfdfdf;padding:8px;margin:10px 0}#debugger .logs li.expandable{cursor:pointer}#debugger .logs li code{display:none}#debugger .logs li.active code{display:inline-block}#debugger .logs li span{display:inline-block}#debugger .logs li .level{width:10%;color:#fff;text-align:center;font-size:11px;line-height:22px;position:relative;border-radius:4px;opacity:.3;top:-4px}#debugger .logs li .time{position:absolute;right:21px;margin-top:-7px;font-size:12px;color:#ccc}#debugger .logs li .view-more{position:absolute;right:21px;margin-top:11px;font-size:12px;color:#ccc}#debugger .logs li .view-more .more{display:inline-block}#debugger .logs li.active .view-more .more{display:none}#debugger .logs li .view-more .less{display:none}#debugger .logs li.active .view-more .less{display:inline-block}#debugger .logs li.active .disclosure-arrow{-webkit-transform:rotate(-180deg);-moz-transform:rotate(-180deg);-ms-transform:rotate(-180deg);-o-transform:rotate(-180deg);transform:rotate(-180deg)}#debugger .logs li .namespace{color:#999;width:11%;font-size:11px;line-height:22px;padding:0 0 0 6px;text-transform:capitalize;text-overflow:ellipsis;white-space:nowrap;overflow:hidden}#debugger .debugger-check-empty,#debugger .debugger-check{position:relative;display:inline-block;vertical-align:baseline;margin-right:4px;width:12px;height:12px;border:1px solid #c4cbd2;border-radius:12px}#debugger .debugger-check-empty{border-color:#909090}#debugger .debugger-check:before{content:\'\';display:block;position:absolute;top:50%;left:50%;margin:-7px 0 0 -4px;height:4px;width:10px;border:solid #888;border-width:0 0 3px 3px;-webkit-transform:rotate(-45deg);-moz-transform:rotate(-45deg);-ms-transform:rotate(-45deg);-o-transform:rotate(-45deg);transform:rotate(-45deg)}#debugger .sidebar li:hover .debugger-check:before{border-color:#eee}#debugger .logs li .message{color:#444;width:75%;border-left:solid 1px #ccc;float:right;padding-left:12px;padding-right:60px;white-space:pre-wrap}#debugger .logs li:hover .level{opacity:1}#debugger .level-filter{background:#F4F4F4;font-size:0;border-bottom:solid 1px #B6B5B5}#debugger .level-filter li{display:inline-block;color:#555;text-transform:capitalize;text-shadow:0 1px 0 #ececec;font-size:12px;padding:5px 20px 3px;cursor:pointer;text-rendering:optimizeLegibility;border-bottom:solid 5px transparent;background:#F4F4F4;position:relative;width:auto;z-index:auto;border:0;border-radius:0}#debugger .level-filter li.active{text-shadow:0 0 rgba(0,0,0,.5);background:#F4F4F4;color:#4C4B4B}#debugger .level-filter li.active._all{border-bottom:solid 5px #A362BC}#debugger .level-filter li.active.error{border-bottom:solid 5px #BA322E}#debugger .level-filter li.active.info{border-bottom:solid 5px #2986C4}#debugger .level-filter li.active.warn{border-bottom:solid 5px #ED9C24}#debugger .level-filter li.active.log{border-bottom:solid 5px #8AC334}#debugger .level-filter li._all:hover{border-bottom:solid 5px #B47AC8}#debugger .level-filter li.error:hover{border-bottom:solid 5px #F24441}#debugger .level-filter li.info:hover{border-bottom:solid 5px #5E9BCE}#debugger .level-filter li.warn:hover{border-bottom:solid 5px #EFC46E}#debugger .level-filter li.log:hover{border-bottom:solid 5px #ACD86D}#debugger .level-filter li.search-data,li.clear-data{float:right}#debugger .level-filter li.search-data>input{height:17px;border-radius:4px;outline:0}#debugger .level-filter li.clear-data:hover{border-bottom:solid 5px #999}#debugger span.json-key{color:#881391;font-size:10px;line-height:11px}#debugger span.json-value{color:#1C00D5;font-size:10px;line-height:11px}#debugger span.json-string{color:#C41A16;font-size:10px;line-height:11px}</style>');
    } ]);
})({}, function() {
    return this;
}());