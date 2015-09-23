/**
 * @todo docs.
 * @todo should most of this live in `../models/instance`?
 */
var _ = require('lodash');
var boom = require('boom');
var async = require('async');
var toNS = require('mongodb-ns');
var store = require('../models/store');

module.exports = {
  get: function(req, res, next) {
    store.findOne({
      'instances._id': req.params.instance_id
    }, function(err, deployment) {
      if (err) {
        return next(err);
      }

      var model = deployment.instances.get(req.instance_id);
      var db = req.mongo.admin().s.db;

      getInstanceDetail(db, function(err, detail) {
        if (err) {
          return next(err);
        }
        var data = _.extend(model.serialize(), detail);
        res.send(data);
      });
    });
  }
};

function getInstanceDetail(db, fn) {
  var tasks = {
    databases: getAllDatabases.bind(null, db),
    collections: getAllCollections.bind(null, db),
    host: getHost.bind(null, db),
    build: getBuild.bind(null, db)
  };
  async.parallel(tasks, function(err, data) {
    if (err) {
      return fn(err);
    }

    rollupAllDatabaseStats(data.databases, function(err, stats) {
      if (err) {
        return fn(err);
      }

      data.stats = stats;
      fn(null, data);
    });
  });
}

function getAllDatabaseNames(db, fn) {
  db.admin().listDatabases(function(err, data) {
    if (err) {
      return fn(err);
    }

    var names = _.chain(data.databases)
      .filter(function(db) {
        return !db.empty;
      })
      .pluck('name')
      .value();
    fn(null, names);
  });
}

function getAllCollections(db, fn) {
  getAllDatabaseNames(db, function(err, names) {
    if (err) {
      return fn(err);
    }
    var tasks = names.map(function(name) {
      return function(cb) {
        db.db(name)
          .listCollections()
          .toArray(function(err, data) {
            if (err) {
              return fn(err);
            }

            var names = data.map(function(doc) {
              var ns = toNS(name + '.' + doc.name);
              return {
                _id: ns.toString(),
                name: ns.collection,
                database: ns.database
              };
            });
            cb(null, names);
          });
      };
    });

    async.parallel(tasks, function(err, res) {
      if (err) {
        return fn(err);
      }
      fn(null, _.flatten(res));
    });
  });
}

function getAllDatabases(db, fn) {
  getAllDatabaseNames(db, function(err, names) {
    if (err) {
      return fn(err);
    }

    var tasks = names.map(function(name) {
      return function(cb) {
        db.db(name).command({
          dbStats: 1
        }, {}, function(err, data) {
          if (err) {
            return cb(err);
          }

          cb(null, {
            _id: name,
            name: name,
            document_count: data.objects,
            document_size: data.dataSize,
            storage_size: data.storageSize,
            index_count: data.indexes,
            index_size: data.indexSize,
            extent_count: data.numExtents,
            file_size: data.fileSize,
            ns_size: data.nsSizeMB * 1024 * 1024
          });
        });
      };
    });
    async.parallel(tasks, fn);
  });
}

function rollupAllDatabaseStats(databases, fn) {
  var keys = [
    'document_count',
    'document_size',
    'storage_size',
    'index_count',
    'index_size',
    'extent_count',
    'file_size',
    'ns_size'
  ];
  var stats = {};

  keys.map(function(k) {
    stats[k] = 0;
  });

  databases.map(function(db) {
    keys.map(function(k) {
      stats[k] += db[k];
    });
  });
  fn(null, stats);
}
function getHost(db, fn) {
  db.admin().command({
    hostInfo: 1
  }, {}, function(err, data) {
    if (err) {
      return fn(err);
    }

    fn(null, {
      system_time: data.system.currentTime,
      hostname: data.system.hostname,
      os: data.os.name,
      os_family: data.os.type.toLowerCase(),
      kernel_version: data.os.version,
      kernel_version_string: data.extra.versionString,
      memory_bits: data.system.memSizeMB * 1024 * 1024,
      memory_page_size: data.extra.pageSize,
      arch: data.system.cpuArch,
      cpu_cores: data.system.numCores,
      cpu_cores_physical: data.extra.physicalCores,
      cpu_scheduler: data.extra.scheduler,
      cpu_frequency: data.extra.cpuFrequencyMHz * 1000000,
      cpu_string: data.extra.cpuString,
      cpu_bits: data.system.cpuAddrSize,
      machine_model: data.extra.model,
      feature_numa: data.system.numaEnabled,
      /* `alwaysFullSync` seen as synchronous :p */
      /* eslint no-sync: 0 */
      feature_always_full_sync: data.extra.alwaysFullSync,
      feature_nfs_async: data.extra.nfsAsync
    });
  });
}

function getBuild(db, fn) {
  db.admin().buildInfo(function(err, data) {
    if (err) {
      return fn(err);
    }
    if (!data) {
      return fn(boom.notAuthorized('not authorized to view build info'));
    }

    fn(null, {
      version: data.version,
      commit: data.gitVersion,
      commit_url: 'https://github.com/mongodb/mongo/commit/' + data.gitVersion,
      flags_loader: data.loaderFlags,
      flags_compiler: data.compilerFlags,
      allocator: data.allocator,
      javascript_engine: data.javascriptEngine,
      debug: data.debug,
      for_bits: data.bits,
      max_bson_object_size: data.maxBsonObjectSize
    });
  });
}
