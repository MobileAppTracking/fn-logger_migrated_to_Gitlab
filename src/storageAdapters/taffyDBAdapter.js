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
  this.taffyDB = new TAFFY();

  var args = _.toArray(arguments);

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
      if (_.isUndefined(record)) {
        args[1] = record = query;
        args[0] = query = undefined;
      }
      return _.contains(taffyDB, record) ? taffyDB(query).update(record) : null;
    },

    /*
     * get all matching records in the storage
     *
     * @param {Object} query The query for all matching rows
     * @return {Array} a array for all matching rows
     */
    get: function(query) {
      return _.isEmpty(taffyDB) ? taffyDB(query).get() : null;
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
      if (_.isUndefined(filterObject)) {
        args[1] = filter = query;
        args[0] = query = undefined;
      }

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
      if (_.isUndefined(column)) {
        args[1] = column = query;
        args[0] = query = undefined;
      }

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
     * @param {Object} query The query for all matching rows
     * @param {String} or {Array of String} columns The name of columns to select
     * @return {Array} a array of distinct values
     * @private
     */

    distinct: function(query, columns) {
      if (_.isUndefined(columns)) {
        args[1] = columns = query;
        args[0] = query = undefined;
      }
      return taffyDB(query).distinct(columns);
    }
  };
};

