var _ = require('lodash');
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var BaseInstance = require('mongodb-instance-model');
var debug = require('debug')('scout-server:models:instance');

var Instance = BaseInstance.extend({
  props: {
    replicaset: 'string',
    state: 'string'
  },
  serialize: function() {
    var res = this.getAttributes({
      props: true,
      derived: true
    }, true);
    if (this.databases.length > 0) {
      _.each(this._children, function(value, key) {
        res[key] = this[key].serialize();
      }, this);
      _.each(this._collections, function(value, key) {
        res[key] = this[key].serialize();
      }, this);
    }

    return res;
  }
});

/**
 * All connections to MongoDB are initiated here.
 *
 * @param {models.Connection} model - Connection details.
 * @param {Function} fn - Callback which receives `(err, db)`.
 */
var connect = function(model, fn) {
  debug('trying to connect... `%j`', model);
  MongoClient.connect(model.uri, model.options, function(err, db) {
    if (err) {
      // @todo (imlucas): Send these to bugsnag?
      debug('connection failed', err);
      fn(err);
      return;
    }

    debug('successfully connected!');
    fn(null, db);
  });
};

module.exports = Instance;
module.exports.Collection = BaseInstance.Collection.extend({
  model: Instance
});
module.exports.connect = connect;
