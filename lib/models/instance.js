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

// @todo (imlucas): Need to pass slaveOk=true for secondaries.
// @todo (imlucas): Backport tunnel support from mongoscope/connect.js
function getConnectionString(connectionState, fn) {
  return fn(null, connectionState.uri);
}

// TODO: check that these are only set if ssl is turned on
function getConnectionOptions(connectionState, fn) {
  return fn(null, connectionState.options);
}

var connect = function(connectionState, fn) {
  getConnectionString(connectionState, function(err, url) {
    if (err) {
      return fn(err);
    }

    getConnectionOptions(connectionState, function(err, opts) {
      if (err) {
        return fn(err);
      }

      debug('trying to connect...');
      MongoClient.connect(url, opts, function(err, db) {
        if (err) {
          debug('connection failed', err);
          return fn(err);
        }
        debug('successfully connected!');

        return fn(null, db);
      });
    });
  });
};

module.exports = Instance;
module.exports.Collection = BaseInstance.Collection.extend({
  model: Instance
});
module.exports.connect = connect;
module.exports.getConnectionString = getConnectionString;
module.exports.getConnectionOptions = getConnectionOptions;

