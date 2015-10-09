var async = require('async');
var _ = require('lodash');
var Cluster = require('mongodb').Mongos;
var Replicaset = require('mongodb').ReplSet;
var Connection = require('./connection');
var store = require('./store');
var BaseDeployment = require('mongodb-deployment-model');
var Instance = require('./instance');
var sharding = require('./sharding');
var replicaset = require('./replicaset');
var format = require('util').format;
var debug = require('debug')('scout-server:models:deployment');

var Deployment = BaseDeployment.extend({
  collections: {
    instances: Instance.Collection
  },
  cannonicalize: function(resp, done) {
    var hostname = this.getId().split(':')[0];
    var parts = hostname.split('.');
    parts.shift();
    var suffix = parts.join('.');

    resp.instances = resp.instances.map(function(instance) {
      var p = instance._id.split(':');
      var hostname = p[0];
      if (hostname === 'localhost') {
        return instance;
      }

      if (hostname.indexOf('.') > -1) {
        return instance;
      }

      // @todo (imlucas): Test that the patched instance_id
      // is actually resolvable w/ `require('dns')`?  Try
      // and connect to it w/ `Instance.connect()`?
      instance.aliases = [instance._id];
      instance._id = format('%s.%s:%s', p[0], suffix, p[1]);
      debug('instance_id fix `%s` -> `%s`', instance.aliases[0], instance._id);
      return instance;
    });


    this.instances.reset(resp.instances, {
      parse: true
    });
    done(null, this);
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

    debug('squishing `%j`', squish);
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
  } else {
    replicaset.discover(db, fn);
  }
}

// Deploy and Instance ID's have the same semantics.
Deployment.getId = Instance.getId;

/**
 * @param {models.Connection} model
 * @param {Function} fn
 */
Deployment.create = function(model, fn) {
  if (typeof model === 'string') {
    model = Connection.fromInstanceId(Deployment.getId(model));
  }
  debug('creating from connection `%j`', model);

  var deployment = new Deployment({
    _id: model.getId(),
    name: model.name
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
        console.error('discovery failed', err);
        client.close();
        return fn(err);
      }

      debug('discover result is', res);

      deployment.cannonicalize({
        instances: res.instances
      }, function(err) {
        if (err) {
          return fn(err);
        }

        debug('closing discovery connection');
        client.close();

        debug('adding to store', deployment.toJSON());
        store.set(model.getId(), deployment, function(err) {
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
  });
};

Deployment.get = function(id, fn) {
  debug('get `%s`', id);
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

Deployment.getOrCreate = function(model, done) {
  debug('get deployment for `%s`', model.getId());
  Deployment.get(model.getId(), function(err, deployment) {
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
