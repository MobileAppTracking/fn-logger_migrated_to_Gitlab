/*
 * @method logDB provider
 * A service for log storage, including init, create, read, update, delete, and getNameSpaces
 */

angular.module('fn.logger').provider('logDB', function() {
  var db = [];
  var results = [];
  var self = this;

  /*
   * set storage configuration
   */

  this.init = function() {
    return;
  }

  /*
   * create record to the storage
   *
   * @param {Object} record The record to insert
   * @return {Array} results The matched rows including the inserted record based on hte current query
   */

  this.create = function(record) {
    db.push(record);
    if (_.contains(_.pluck(results, 'namespace'), record.namespace) && _.contains(_.pluck(results, 'level'), record.level)) {
      results.push(record);
      return results;
    }
  }

  /*
   * get records from the storage
   *
   * @param {Object} query object
   * @return {Array} db or query results The matched rows in the storage
   */

  this.read = function(query) {
    if (_.isUndefined(query)) {
      return db;
    }

    results =  _.filter(db, function(record) {
      for (var key in query) {
        if (!_.contains(query[key], record[key])) {
          return false;
        }
      }
      return true;
    });

    results = _.sortBy(results, 'time');
    return results;
  }

  /*
   * update the record
   *
   * @param {Object} payload The payload needs to be updated for the record
   * @return {boolean} True on success, else false
   */

  this.update = function(id, payload) {
    _.each (db, function(record) {
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
    _.each (results, function(result) {
      db.splice(_.indexOf(db, result), 1);
    });

    results.length = 0;

    return true;
  }

  /*
   * get distinct namespaces
   *
   * @return {Array} distinct namespaces
   */

  this.getNameSpaces = function() {
    var values = _.pluck(db, 'namespace');
    return _.uniq(values);
  }

  this.$get = function() {
    return self;
  }

});