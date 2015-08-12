var async = require('async');
var _ = require('lodash');
var toURL = require('mongodb-url');
var Cluster = require('mongodb').Mongos;
var Replicaset = require('mongodb').ReplSet;
var store = require('./store');
var Instance = require('./instance');
var sharding = require('./sharding');
var replicaset = require('./replicaset');
var autonamer = require('./deployment-auto-namer');
var debug = require('debug')('scout-server:models:deployment');


module.exports = require('mongodb-deployment-model');

var squash = function(deployment, fn) {
  debug('checking if squash required');
  var ids = _.pluck(deployment.instances, '_id');
  var squish = [];

  store.all(function(err, docs) {
    if (err) return fn(err);

    docs.map(function(doc) {
      // Skip current
      if (doc._id === deployment._id) return;

      var res = _.chain(doc.instances)
        .pluck('_id')
        .filter(function(id) {
          return ids.indexOf(id) > -1;
        })
        .value();

      if (res.length > 0) {
        squish.push(doc);
      }
    });
    // nothing to squish
    if (squish.length === 0) return fn();

    debug('squishing', squish);
    async.parallel(squish.map(function(d) {
      return function(cb) {
        store.remove(d._id, function(err) {
          cb(err);
        });
      };
    }), function(err) {
      fn(err, squish);
    });
  });
};

/**
 * Weave our way through to find all of the instances in a deployment.
 *
 * @todo: handle dynamic updates (new members, state changes) and
 * update the deployment store
 * @param {mongodb.DB} db - The database we're connected to.
 * @param {Function} fn - (err, {mongodb-models-deployment})
 */
function discover(db, fn) {
  if (db.serverConfig instanceof Cluster) {
    debug('its a cluster');
    sharding.discover(db, fn);
  } else if (db.serverConfig instanceof Replicaset) {
    debug('its a replicaset');
    replicaset.discover(db, fn);
  } else {
    debug('its a standalone');
    process.nextTick(function() {
      var p = db.serverConfig.s;
      fn(null, {
        instances: [toURL(p.host + ':' + p.port).toJSON()]
      });
    });
  }
}

module.exports.create = function(_id, opts, fn) {
  debug('creating %s: `%j`', _id, opts);
  opts = opts || {};
  if (typeof opts === 'function') {
    fn = opts;
    opts = {};
  }

  var deployment = {
    name: '',
    _id: _id,
    instances: []
  };

  Instance.connect(_id, opts, function(err, conn) {
    if (err) return fn(err);
    if (!conn) return fn(new Error('could not connect'));

    deployment.name = toURL(_id).name;

    discover(conn, function(err, res) {
      if (err) {
        conn.close();
        return fn(err);
      }

      deployment.instances = res.instances;
      deployment.sharding = res.sharding;

      debug('closing discovery connection');
      conn.close();
      debug('adding to store');
      store.set(_id, deployment, function(err) {
        if (err) return fn(err);

        squash(deployment, function() {
          debug('deployment created!');
          fn(null, deployment);
        });
      });
    });
  });
};

module.exports.get = function(id, opts, fn) {
  debug('get `%s`', id);
  if (typeof opts === 'function') {
    fn = opts;
    opts = fn;
  }

  var deployment;

  store.get(id, function(err, dep) {
    deployment = dep;

    if (err) return fn(err);

    if (deployment) {
      return fn(null, deployment);
    }

    store.all(function(err, docs) {
      if (err) return fn(err);

      docs.map(function(doc) {
        doc.instances.map(function(instance) {
          if (instance._id === id && !deployment) {
            deployment = doc;
          }
        });
      });
    });
    fn(null, deployment);
  });
};
// @todo (imlucas): Do this in Deployment.parse?
module.exports.autonamer = autonamer;

module.exports.list = function(done) {
  store.all(done);
};
