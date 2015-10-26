/**
 * @todo (imlucas): Cleanup and :axe: to `mongodb-deployment-model`.
 */
var async = require('async');
var _ = require('lodash');
var Connection = require('mongodb-connection-model');
var store = require('./store');
var BaseDeployment = require('mongodb-deployment-model');
var Instance = require('./instance');
var replicaset = require('./replicaset');
var format = require('util').format;
var debug = require('debug')('scout-server:models:deployment');

var Deployment = BaseDeployment.extend({
  collections: {
    instances: Instance.Collection
  },
  cannonicalize: function(resp, done) {
    var _id = resp._id || this.getId();

    var hostname = _id.split(':')[0];
    var parts = hostname.split('.');
    parts.shift();
    var suffix = parts.join('.');

    if (Array.isArray(resp.instances)) {
      resp.instances = resp.instances.map(function(instance) {
        var p = instance._id.split(':');

        var instanceHostname = p[0];

        /**
         * @see https://jira.mongodb.org/browse/INT-730
         */
        if (instanceHostname === 'localhost'
          || instanceHostname.indexOf('.') > -1
          || !suffix) {
          return instance;
        }

        /**
         * @todo (imlucas): Test that the patched instance_id
         * is actually resolvable w/ `require('dns')`?  Try
         * and connect to it w/ `Instance.connect()`?
         */
        instance.aliases = [instance._id];
        instance._id = format('%s.%s:%s', p[0], suffix, p[1]);
        debug('instance_id fix `%s` -> `%s`', instance.aliases[0], instance._id);
        return instance;
      });

      this.instances.reset(resp.instances, {
        parse: true
      });
    }
    done(null, this);
  }
});

var squash = function(deployment, fn) {
  debug('checking if squash required');
  var ids = _.pluck(deployment.instances, '_id');
  var squish = [];
  async.waterfall([
    store.all, function(docs) {
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
        debug('nothing to squash');
        fn();
        return;
      }

      debug('squishing `%j`', squish);
      var tasks = squish.map(function(d) {
        return store.remove.bind(null, d._id);
      });

      async.parallel(tasks, function(err) {
        fn(err, squish);
      });
    }
  ]);
};

/**
 * Weave our way through to find all of the instances in a deployment.
 *
 * @todo (imlucas): handle dynamic updates (new members, state changes) and
 * update the deployment store.
 *
 * @param {mongodb.DB} db - The database we're connected to.
 * @param {Function} fn - Callback `(err, {Deployment})`.
 */
function discover(db, fn) {
  replicaset.discover(db, fn);
}

// Deploy and Instance ID's have the same semantics.
Deployment.getId = Instance.getId;

/**
 * @param {models.Connection} connection - How to connect to discover the deployment.
 * @param {Function} fn - Callback `(err, {Deployment})`.
 */
Deployment.create = function(connection, fn) {
  if (typeof connection === 'string') {
    connection = Connection.from(
      Deployment.getId(connection));
  }
  debug('creating from connection `%j`', connection);

  var deployment = new Deployment({
    _id: connection.getId(),
    name: connection.name
  });

  Instance.connect(connection, function(err, client) {
    if (err) {
      fn(err);
      return;
    }
    if (!client) {
      fn(new Error('Could not connect'));
      return;
    }

    discover(client, function(err, res) {
      if (err) {
        debug('discovery failed', err);
        client.close();
        fn(err);
        return;
      }

      debug('discover result is', res);

      deployment.cannonicalize({
        instances: res.instances
      }, function(err) {
        if (err) {
          fn(err);
          return;
        }

        debug('closing discovery connection');
        client.close();

        debug('adding to store', deployment.toJSON());
        store.set(deployment.getId(), deployment, function(err) {
          if (err) {
            fn(err);
            return;
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
