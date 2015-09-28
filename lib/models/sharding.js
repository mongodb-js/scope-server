var async = require('async');
var Instance = require('./instance');
var toURL = require('mongodb-url');
var mongodbError = require('../mongodb-error');
var debug = require('debug')('scout-server:models:sharding');

function Sharding(db) {
  this.db = db.db('config');
  this.data = {
    settings: {},
    balancer: {},
    instances: [],
    collections: []
  };

  this.stats = {
    shards: {}
  };
}

Sharding.prototype.prepare = function(fn) {
  var self = this;

  self.getShards(function(err, shards) {
    if (err) {
      return fn(err);
    }
    shards.map(function(shard) {
      shard.instances.map(function(inst) {
        self.data.instances.push(inst);
      });
    });

    self.db.collection('mongos').find({}).toArray(function(err, docs) {
      if (err) {
        return fn(err);
      }

      docs.map(function(doc) {
        self.data.instances.push({
          _id: Instance.getId(doc._id),
          name: doc._id,
          type: 'router'
        });
      });

      self.getConfigServers(function(err, urls) {
        if (err) {
          return fn(err);
        }

        urls.map(function(url) {
          self.data.instances.push({
            _id: Instance.getId(url),
            name: url,
            type: 'config'
          });
        });
        debug('resolved instances', self.data.instances);
        fn(null, self.data);
      });
    });
  });
};

Sharding.prototype.getConfigServers = function(fn) {
  this.db.db('admin').command({
    getCmdLineOpts: 1
  }, function(err, data) {
    if (err) {
      if (mongodbError.isNotAuthorized(err)) {
        debug('not authorized to get config servers. omitting.');
        return fn(null, []);
      }
      return fn(err);
    }

    fn(null, data.parsed.sharding.configDB.split(','));
  });
};

Sharding.prototype.getShards = function(fn) {
  this.db.collection('shards').find({}).toArray(function(err, docs) {
    if (err) {
      return fn(err);
    }
    debug('find shards', err, docs);

    var tasks = docs.map(function(doc) {
      return function(cb) {
        this.getShardDetail(doc._id, cb);
      }.bind(this);
    }.bind(this));

    async.parallel(tasks, fn);
  }.bind(this));
};

Sharding.prototype.getShardDetail = function(shardId, done) {
  var detail = {
    instances: [],
    stats: {
      index_sizes: {},
      document_count: 0,
      document_size: 0,
      storage_size: 0,
      index_count: 0,
      index_size: 0,
      extent_count: 0,
      extent_last_size: 0,
      padding_factor: 0
    }
  };
  var source = this.stats.shards[shardId];
  debug('get shard detail', shardId);

  this.db.collection('shards').find({
    _id: shardId
  }).toArray(function(err, data) {
    if (err) {
      return done(err);
    }

    data.map(function(doc) {
      var rs = doc.host.split('/')[0];
      doc.host.replace(rs + '/', '').split(',').map(function(h) {
        var instance = toURL(h).shard(shardId).toJSON();
        instance._id = Instance.getId(h);
        detail.instances.push(instance);
      });
    });

    if (source) {
      detail.stats = {
        index_sizes: source.indexSizes,
        document_count: source.count,
        document_size: source.size,
        storage_size: source.storageSize,
        index_count: source.nindexes,
        index_size: source.totalIndexSize,
        extent_count: source.numExtents,
        extent_last_size: source.lastExtentSize,
        padding_factor: source.paddingFactor
      };
    }
    debug('shard detail is', detail);
    done(null, detail);
  });
};

module.exports.discover = function(db, fn) {
  return new Sharding(db).prepare(function(err, info) {
    if (err) {
      return fn(err);
    }

    fn(null, {
      instances: info.instances,
      sharding: info.databases
    });
  });
};
