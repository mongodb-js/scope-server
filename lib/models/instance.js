var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var Instance = require('mongodb-instance-model');
var debug = require('debug')('scout-server:models:instance');


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
  return fn(null, url);
}

var connect = function(instance_id, opts, fn) {
  opts = opts || {};
  if (typeof opts === 'function') {
    fn = opts;
    opts = {};
  }

  getConnectionString(instance_id, opts, function(err, url) {
    if (err) return fn(err);

    debug('trying to connect to `%s`', url);
    MongoClient.connect(url, function(err, db) {
      if (err) {
        debug('failed', err);
        return fn(err);
      }
      debug('successfully connected!');
      return fn(null, db);
    });
  });
};

module.exports = Instance;
module.exports.connect = connect;
