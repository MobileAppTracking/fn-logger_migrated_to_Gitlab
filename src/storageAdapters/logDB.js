/*
 * @method logDB provider
 * A service for log storage, including init, create, read, update, delete, and getNameSpaces methods
 */

angular.module('fn.logger').provider('logDB', function() {
  this.db = [];
  var currentResults = [];
  var prevResults = [];

  /*
   * set storage configuration
   */

  this.init = angular.noop();

  /*
   * create record to the storage
   *
   * @param {Object} record The record to insert
   * @return {boolean} True on success, else false
   */

  this.create = function(record) {
    this.db.push(record);

    if (currentResults.length == 0) {
      var activeNameSpaces = _.pluck(prevResults, 'namespace');
      var activeLevels = _.pluck(prevResults, 'level');
    } else {
      activeNameSpaces = _.pluck(currentResults, 'namespace');
      activeLevels = _.pluck(currentResults, 'level');
    }

    if (_.contains(activeNameSpaces, record.namespace) && _.contains(activeLevels, record.level)) {
      currentResults.push(record);
    }
    return true;
  }

  /*
   * get records from the storage
   *
   * @param {Object} query object
   * @return {Array} db or query results The matched rows in the storage
   */

  this.read = function(query) {
    currentResults =  _.filter(this.db, function(record) {
      for (var key in query) {
        if (!_.contains(query[key], record[key])) {
          return false;
        }
      }
      return true;
    });

    currentResults = _.sortBy(currentResults, 'time');
    return currentResults;
  }

  /*
   * update the record
   *
   * @param {Object} payload The payload needs to be updated for the record
   * @return {boolean} True on success, else false
   */

  this.update = function(id, payload) {
    _.each (this.db, function(record) {
      if (record.id == id) {
        record = _.extend(record, payload);
      }
    });

    return true;
  }

  /*
   * delete the record
   *
   * @return {boolean} True on success, else false
   */

  this.delete = function() {
    var db = this.db;
    prevResults = _.clone(currentResults); //save the results before deleting
    _.each (currentResults, function(result) {
      db.splice(_.indexOf(db, result), 1);
    });

    return true;
  }

  /*
   * get distinct namespaces
   *
   * @return {Array} distinct namespaces
   */

  this.getNameSpaces = function() {
    var values = _.pluck(this.db, 'namespace');
    return _.uniq(values);
  }

  this.$get = function() {
    return this;
  }

});