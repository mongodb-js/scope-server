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
function getConnectionString(instance_id, opts, fn) {
  var url = '';
  var auth = opts.auth;

  if (instance_id.indexOf('mongodb://') === -1) {
    url += 'mongodb://';
  }

  if (auth && auth.mongodb) {
    url += auth.mongodb.username + ':' + auth.mongodb.password + '@';
  }

  url += instance_id;
  url += '?slaveOk=true';
  return fn(null, url);
}

var connect = function(instance_id, opts, fn) {
  getConnectionString(instance_id, opts, function(err, url) {
    if (err) return fn(err);

    debug('trying to connect...');
    MongoClient.connect(url, {
      connectWithNoPrimary: true
    }, function(err, db) {
      if (err) {
        debug('connection failed', err);
        return fn(err);
      }
      debug('successfully connected!');
      return fn(null, db);
    });
  });
};

module.exports = Instance;
module.exports.Collection = BaseInstance.Collection.extend({
  model: Instance
});
module.exports.connect = connect;
module.exports.getConnectionString = getConnectionString;
