/**
  * @class fn.logger.taffyStorageWrapper
  * A wrapper for using taffyDB storage
  *
  * @return {Object} A wrapper containing init, set, get, filter, and remove methods
  */
var TaffyDBAdapter = function() {
  /*
   * create a new empty taffyDB
   */
  if (typeof TAFFY == 'function') {
    this.taffyDB = new TAFFY();
    return {

      /*
       * set taffyDB configuration
       *
       * @param {Object} config The database configuration to be set
       * @return {Object} The settings object
       * @private
       */
      init: function(config) {
        return _.isObject(config) ? taffyDB.settings(config) : null;
      },

      /*
       * insert the record to the storage
       *
       * @param {Object} record The column/value pair to insert
       * @return {Object} A query pointing to the inserted record
       * @private
       */
      insert: function(record) {
        return _.isObject(record) ? taffyDB.insert(record) : null;
      },

      /*
       * update records in the storage
       *
       * @param {Object} query The query for all matching rows
       * @param {Object} record The updated column/value pair
       * @return {Object} the updated rows if the record is in the storage, else null
       */
      update: function(query, record) {
        return _.contains(taffyDB, record) ? taffyDB(query).update(record) : null;
      },

      /*
       * get all matching records in the storage
       *
       * @return {Array} a array for all matching rows
       */
      get: function() {
        return _.isEmpty(taffyDB) ? taffyDB().get() : null;
      },

      /*
       * filter the records in the storage
       *
       * @param {Object} query for all matching records
       * @param {Object} filterObject pointing to column/value pair for filtering
       * @return {Object} rows of filtering result
       * @private
       */
      filter: function(query,filterObject) {
        return taffyDB(query).filter(filterObject);
      },

      /*
       * order the records in the storage by columnname
       *
       * @param {Object} query for all matching records
       * @param {String} column and sort direction
       * @return {boolean} True on Success, else false
       * @private
       */
      order: function(query, column) {
        return taffyDB(query).order(column);
      },

      /*
       * remove the specified column/value pairs in the storage
       *
       * @param {Object} query The query for all matching rows to remove
       * @return {Integer} The count of the removed records
       * @private
       */
      remove: function(query) {
        return taffyDB(query).remove();
      },

      /*
       * Select distinct values from the databbase for one or more columns
       *
       * @param {String} or {Array of String} columns The name of columns to select
       * @return {Array} a array of distinct values
       * @private
       */

      distinct: function(columns) {
        return taffyDB().distinct(columns);
      }
    }
  } else {
    throw new Error('TaffyDb logging disabled because TAFFY not loaded');
    return null;
  }
};

