var async = require('async');
var _ = require('lodash');
var toURL = require('mongodb-url');
var Cluster = require('mongodb').Mongos;
var Replicaset = require('mongodb').ReplSet;
var store = require('./store');
var Connection = require('./connection');
var BaseDeployment = require('mongodb-deployment-model');
var Instance = require('./instance');
var sharding = require('./sharding');
var replicaset = require('./replicaset');
var debug = require('debug')('scout-server:models:deployment');

var Deployment = BaseDeployment.extend({
  collections: {
    instances: Instance.Collection
  }
});

var squash = function(deployment, fn) {
  debug('checking if squash required');
  var ids = _.pluck(deployment.instances, '_id');
  var squish = [];

  store.all(function(err, docs) {
    if (err) {
      return fn(err);
    }

    docs.map(function(doc) {
      // Skip current
      if (doc._id === deployment._id) {
        return;
      }

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
    if (squish.length === 0) {
      return fn();
    }

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
 * @param {Function} fn - (err, {Deployment})
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

/**
 * @param {models.Connection} model
 * @param {Function} fn
 */
Deployment.create = function(model, fn) {
  if (typeof model === 'string') {
    model = new Connection({
      instance_id: model
    });
  }
  debug('creating from connection `%j`', model);
  var _id = model.instance_id;

  var deployment = new Deployment({
    name: _id,
    _id: _id
  });

  Instance.connect(model, function(err, client) {
    if (err) {
      return fn(err);
    }
    if (!client) {
      return fn(new Error('Could not connect'));
    }

    discover(client, function(err, res) {
      if (err) {
        client.close();
        return fn(err);
      }

      debug('discover result is', res);

      deployment.set({
        instances: res.instances,
        sharding: res.sharding
      }, {
        parse: true
      });

      debug('closing discovery connection');
      client.close();

      debug('adding to store');
      store.set(_id, deployment, function(err) {
        if (err) {
          return fn(err);
        }

        squash(deployment, function() {
          debug('deployment created!');
          fn(null, deployment);
        });
      });
    });
  });
};

Deployment.get = function(id, opts, fn) {
  debug('get `%s`', id);
  if (typeof opts === 'function') {
    fn = opts;
    opts = fn;
  }

  var deployment;

  store.get(id, function(err, dep) {
    deployment = dep;

    if (err) {
      return fn(err);
    }

    if (deployment) {
      return fn(null, deployment);
    }

    store.all(function(err, docs) {
      if (err) {
        return fn(err);
      }

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

Deployment.list = function(done) {
  store.all(done);
};

// Deploy and Instance ID's have the same semantics.
Deployment.getId = Instance.getId;


Deployment.getOrCreate = function(model, done) {
  debug('get deployment for `%s`', model.instance_id);
  Deployment.get(model.instance_id, function(err, deployment) {
    if (err) {
      return done(err);
    }

    if (deployment) {
      debug('deployment already exists');
      return done(null, deployment);
    }
    debug('deployment doesnt exist yet so creating...');
    Deployment.create(model, function(err, deployment) {
      if (err) {
        return done(err);
      }
      done(null, deployment);
    });
  });
};

module.exports = Deployment;
