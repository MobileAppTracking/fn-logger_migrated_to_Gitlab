Fn-logger
========

A improved logger for front end debugging


Required bower packages
-----------------------
- jquery
- angular
- angular-sanitize
- lodash

Demo
----
- Demo can be found at (http://mobileapptracking.github.io/fn-logger/)

Getting started
---------------
1. Link scripts

```
<script src="../bower_components/jquery/jquery.min.js"></script>
<script src="../bower_components/angular/angular.js"></script>
<script src="../bower_components/angular-sanitize/angular-sanitize.min.js"></script>
<script src="../bower_components/lodash/dist/lodash.underscore.min.js"></script>
<script src="../fn.logger.js"></script>
```

2. Prepare the call of fn-logger

```
<script>
angular.module('testApp', ['fn.logger']).controller('TestController', function($scope, $log) {
  $log.info('test');
});
</script>

```








