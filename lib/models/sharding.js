var async = require('async');
var Instance = require('./instance');
var _ = require('lodash');
var mongodbError = require('../mongodb-error');
var debug = require('debug')('scout-server:models:sharding');

/**
 * Get metadata on the Router instances in use,
 * a.k.a. `mongos` processes.
 *
 * @param {mongodb.DB} db - An available connection.
 * @param {Function} fn - Callback which receives `(err, [instance])`.
 * @see http://npm.im/mongodb-instance-model
 */
exports.getRouterInstances = function(db, fn) {
  db.db('config').collection('mongos')
    .find({})
    .toArray(function(err, docs) {
      if (err) {
        if (mongodbError.isNotAuthorized(err)) {
          debug('not authorized to get metadata to '
            + 'discover router instances. omitting.');
          return fn(null, []);
        }
        return fn(err);
      }

      var res = docs.map(function(doc) {
        return {
          _id: Instance.getId(doc._id),
          name: doc._id,
          type: 'router'
        };
      });

      debug('router instances', res);
      fn(null, res);
    });
};

/**
 * Get metadata on the Store instances in use,
 * a.k.a. `mongod` processes.
 *
 * @param {mongodb.DB} db - An available connection.
 * @param {Function} fn - Callback which receives `(err, [instance])`.
 * @see http://npm.im/mongodb-instance-model
 */
exports.getStoreInstances = function(db, fn) {
  db.db('config').collection('shards')
    .find({})
    .toArray(function(err, docs) {
      if (err) {
        return fn(err);
      }
      debug('shards docs', docs);
      var hosts = _.pluck(docs, 'host');

      var res = _.flatten(_.map(hosts, function(url) {
        return url.split('/')[1].split(',').map(function(d) {
          return {
            _id: d
          };
        });
      }));

      debug('store instances', res);
      fn(null, res);
    });
};

/**
 * Get metadata on the Config instances in use,
 * a.k.a. `mongod --configsrv` processes.
 *
 * @param {mongodb.DB} db - An available connection.
 * @param {Function} fn - Callback which receives `(err, [instance])`.
 * @see http://npm.im/mongodb-instance-model
 */
exports.getConfigInstances = function(db, fn) {
  db.db('admin').command({
    getCmdLineOpts: 1
  }, function(err, data) {
    if (err) {
      // @todo (imlucas): Way to get config servers w/ a
      // command that needs lower security privlege?
      if (mongodbError.isNotAuthorized(err)) {
        debug('not authorized to get metadata to '
          + 'discover config instances. omitting.');
        return fn(null, []);
      }
      return fn(err);
    }

    var sharding = data.parsed.sharding;
    var res = sharding.configDB.split(',').map(function(url) {
      return {
        _id: Instance.getId(url),
        name: url,
        type: 'config'
      };
    });
    debug('config instances', res);
    fn(null, res);
  });
};

/**
 * Convenience for getting all Store, Config, and Router
 * instances as a flat list.
 *
 * @param {mongodb.DB} db - An available connection.
 * @param {Function} fn - Callback which receives `(err, [instance])`.
 * @see http://npm.im/mongodb-instance-model
 */
exports.discover = function(db, fn) {
  async.series([
    exports.getStoreInstances.bind(null, db),
    exports.getConfigInstances.bind(null, db),
    exports.getRouterInstances.bind(null, db)
  ], function(err, res) {
    if (err) return fn(err);
    fn(null, {
      instances: _.flatten(res)
    });
  });
};


exports.getShardIds = function(db, fn) {
  var options = {
    fields: {
      _id: 1
    }
  };

  db.db('config')
    .collection('shards')
    .find({}, options)
    .toArray(function(err, docs) {
      if (err) {
        return fn(err);
      }
      fn(null, _.pluck(docs, '_id'));
    });
};

exports.getVersion = function(db, fn) {
  db.db('config')
    .collection('version')
    .find({})
    .toArray(function(err, data) {
      if (err) return fn(err);
      fn(null, data && data[0]);
    });
};

exports.getSettings = function(db, fn) {
  db.db('config')
    .collection('settings')
    .find({})
    .toArray(function(err, docs) {
      if (err) return fn(err);

      var settings = {};
      docs.map(function(doc) {
        settings[doc._id] = doc.value;
      });
      fn(null, settings);
    });
};

exports.getBalancer = function(db, fn) {
  var state = true;
  var running = false;
  var query = {
    _id: 'balancer'
  };

  db.db('config')
    .collection('settings')
    .findOne(query, function(err, doc) {
      if (err) return fn(err);
      if (doc) {
        state = !doc.stopped;
      }
      db.db('config')
        .collection('locks')
        .findOne(query, function(err, doc) {
          if (err) return fn(err);
          if (doc) {
            running = doc.state > 0;
          }
          fn(null, {
            state: state,
            running: running
          });
        });
    });
};

exports.getChangelog = function(db, fn) {
  db.db('config').collection('changelog').find({}).toArray(fn);
};

exports.getLocks = function(db, fn) {
  db.db('config').collection('locks').find({}).toArray(fn);
};

exports.getLockPings = function(db, fn) {
  db.db('config').collection('lockpings').find({}).toArray(fn);
};

// @todo (imlucas): reimplement
//
// exports.getDatabases = function(db, fn) {
//   db.db('config')
//     .collection('databases')
//     .find({})
//     .sort({
//       name: 1
//     })
//     .toArray(function(err, databases) {
//       if (err) return fn(err);
//
//       debug('databases on this cluster', databases);
//
//       async.parallel(databases.map(function(database) {
//         return function(done) {
//           var q = {
//             _id: new RegExp('^' + database._id + '\\.')
//           };
//           self.db.collection('collections').find(q).sort({
//             _id: 1
//           }).toArray(function(err, collections) {
//             if (err) return done(err);
//             debug('collections in ' + database._id, collections);
//             async.parallel(collections.map(function(coll) {
//               return function(cb) {
//                 self.getCollectionDetails(coll, cb);
//               };
//             }), done);
//           });
//         };
//       }), fn);
//     });
// };
//
// exports.getShardDetail = function(db, shardId, done) {
//   var res = {
//     instance_ids: [],
//     stats: {
//       index_sizes: {},
//       document_count: 0,
//       document_size: 0,
//       storage_size: 0,
//       index_count: 0,
//       index_size: 0,
//       extent_count: 0,
//       extent_last_size: 0,
//       padding_factor: 0
//     }
//   };
//
//   debug('get shard detail', shardId);
//   this.db.collection('shards').find({
//     _id: shardId
//   }).toArray(function(err, data) {
//     if (err) {
//       return done(err);
//     }
//
//     data.map(function(doc) {
//       var rs = doc.host.split('/')[0];
//       doc.host.replace(rs + '/', '').split(',').map(function(h) {
//         var instance = toURL(h).shard(shardId).toJSON();
//         instance._id = Instance.getId(h);
//         detail.instances.push(instance);
//       });
//     });
//
//     if (source) {
//       detail.stats = {
//         index_sizes: source.indexSizes,
//         document_count: source.count,
//         document_size: source.size,
//         storage_size: source.storageSize,
//         index_count: source.nindexes,
//         index_size: source.totalIndexSize,
//         extent_count: source.numExtents,
//         extent_last_size: source.lastExtentSize,
//         padding_factor: source.paddingFactor
//       };
//     }
//     debug('shard detail is', detail);
//     done(null, detail);
//   });
// };

module.exports = exports;
