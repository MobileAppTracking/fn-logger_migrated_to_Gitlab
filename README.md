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
<script src="../bower_components/angular/angular.js"></script>
<script src="../fn.logger.js"></script>
//use either lodash or underscore
<script src="../bower_components/lodash/dist/lodash.underscore.min.js"></script>
```

2. Prepare the call of fn-logger

```
<script>
angular.module('testApp', ['fn.logger']).controller('TestController', function($scope, $log) {
  //log the message 'test' in the type of information in 'default' namespace
  $log.info('default', 'test');
});
</script>

```
Custom log storage
-----------------------
fn-logger provides logDB storage service for storing, querying and sorting logs. You can override the logDB
with other databases (e.g. TaffyDB, firebase) for storage mechanism.

### Custom storage mechanism

```
// decorate the logDB with TaffyDB database
<script>
angular.module('fn.logger').config(['$provide',function($provide) {
  $provide.decorator('logDB', ['$delegate', function($delegate) {
    $delegate.db = new TaffyDB();

    //override the methods of logDB
    $delegate.create = function (record) {
      return $delegate.db.insert(record);
    }

    return logDB = $delegate;
  }]);
}]);
</script>
```







