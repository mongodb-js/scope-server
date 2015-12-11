/**
 * TODO (imlucas): Needs cleanup and :axe: to `mongodb-collection-model`.
 */
var debug = require('debug')('mongodb-scope-server:routes:collection');
var boom = require('boom');
var async = require('async');
var _ = require('lodash');
var EJSON = require('mongodb-extended-json');

var createSampleStream = require('mongodb-collection-sample');
var setHeaders = require('../streams/set-headers');
var format = require('../middleware/format');

var with_cursor_options = require('../middleware/cursor-options');
var with_cursor = require('../middleware/cursor');
var ReadPreference = require('mongodb-read-preference');

function getCollectionFeatures(req, fn) {
  if (req.collection_features) {
    return process.nextTick(function() {
      fn(null, req.collection_features);
    });
  }

  var spec = {
    collStats: req.ns.collection
  };

  var options = {
    verbose: 1,
    readPreference: ReadPreference.nearest
  };

  req.db.command(spec, options, function(err, data) {
    if (err) {
      debug('error getting collection features:', err);
      err.command = 'collStats';
      return fn(err);
    }

    req.collection_features = {
      capped: data.capped,
      max_document_count: data.max,
      max_document_size: data.maxSize,
      size: data.size,
      power_of_two: data.userFlags === 1,
      index_details: data.indexDetails || {},
      wired_tiger: data.wiredTiger || {}
    };
    fn(null, req.collection_features);
  });
}

function getCollectionStats(req, fn) {
  if (req.collection_stats) {
    return process.nextTick(function() {
      fn(null, req.collection_stats);
    });
  }

  var spec = {
    collStats: req.ns.collection
  };

  var options = {
    verbose: 1,
    readPreference: ReadPreference.nearest
  };

  req.db.command(spec, options, function(err, data) {
    if (err) {
      debug('error getting collection stats:', err);
      err.command = 'collStats';
      return fn(err);
    }

    req.collection_stats = {
      index_sizes: data.indexSizes,
      document_count: data.count,
      document_size: data.size,
      storage_size: data.storageSize,
      index_count: data.nindexes,
      index_size: data.totalIndexSize,
      padding_factor: data.paddingFactor,
      extent_count: data.numExtents,
      extent_last_size: data.lastExtentSize,
      flags_user: data.userFlags,
      flags_system: data.systemFlags
    };
    fn(null, req.collection_stats);
  });
}

function getCollectionIndexes(req, fn) {
  var spec = {};

  var options = {
    readPreference: ReadPreference.nearest
  };

  req.db.collection(req.ns.collection)
    .listIndexes(spec, options)
    .toArray(function(err, res) {
      if (err) {
        debug('error getting collection indexes:', err);
        err.command = 'listIndexes';
        fn(err);
        return;
      }
      fn(null, res);
    });
}

function getCollection(req, next) {
  var tasks = {
    indexes: getCollectionIndexes.bind(null, req),
    stats: getCollectionStats.bind(null, req),
    features: getCollectionFeatures.bind(null, req)
  };
  async.parallel(tasks, function(err, data) {
    if (err) {
      return next(err);
    }

    var model = _.extend(data.features, data.stats, {
      _id: req.ns.toString(),
      name: req.ns.collection,
      database: req.ns.database,
      indexes: data.indexes
    });

    next(null, model);
  });
}

module.exports = {
  get: function(req, res, next) {
    getCollection(req, function(err, model) {
      if (err) {
        return next(err);
      }
      res.send(model);
    });
  },
  find: [with_cursor_options, with_cursor, function(req, res, next) {
    if (!req.params.cursor_options.explain) {
      return next();
    }

    req.cursor.explain(function(err, data) {
      if (err) {
        err.command = 'explain';
        return next(err);
      }
      res.send(data);
    });
  }, format
  ],
  count: [with_cursor_options, with_cursor, function(req, res, next) {
    var options = {
      readPreference: ReadPreference.nearest
    };
    req.cursor.count({}, options, function(err, data) {
      if (err) {
        debug('error running count:', err);
        err.command = 'count';
        return next(err);
      }

      res.send({
        count: data
      });
    });
  }
  ],
  sample: function(req, res) {
    createSampleStream(req.db, req.ns.collection, req.params.sample_options)
      .on('error', function(err) {
        debug('database errror', err);
        return res.emit('error', err);
      })
      .pipe(EJSON.createStringifyStream())
      .pipe(setHeaders(req, res, {
        'content-type': 'application/json'
      }))
      .pipe(res);
  },
  bulk: function(req, res, next) {
    if (!Array.isArray(req.body)) {
      return next(boom.badRequest('Body should be an array'));
    }

    var batch = req.col.initializeUnorderedBulkOp();
    req.body.map(batch.insert.bind(batch));
    batch.execute(function(err, result) {
      if (err) {
        err.command = 'executeBulkOp';
        return next(err);
      }

      var data = {
        processed_count: req.body.length,
        write_errors: result.writeErrors || [],
        write_concern_errors: result.writeConcernErrors || [],
        inserted_count: result.nInserted,
        upserted_count: result.nUpserted,
        matched_count: result.nMatched,
        modified_count: result.nModified,
        removed_count: result.nRemoved,
        upserted: result.upserted || []
      };
      res.send(data);
    });
  },
  distinct: function(req, res, next) {
    var db = req.mongo.db(req.params.database_name);
    var collection = db.collection(req.params.collection_name);
    collection.distinct(req.params.key, req.json('query', '{}'), function(err, docs) {
      if (err) {
        err.command = 'distinct';
        return next(err);
      }
      res.send(docs);
    });
  },
  aggregate: function(req, res, next) {
    var pipeline = req.json('pipeline');
    var opts = {
      explain: req.boolean('explain'),
      allowDiskUse: req.boolean('allowDiskUse'),
      cursor: req.json('cursor')
    };

    var db = req.mongo.db(req.params.database_name);
    var collection = db.collection(req.params.collection_name);
    collection.aggregate(pipeline, opts, function(err, docs) {
      if (err) {
        err.command = 'aggregate';
        return next(err);
      }
      res.send(docs);
    });
  },
  plans: function(req, res, next) {
    var spec = {
      planCacheListPlans: req.params.collection_name,
      query: req.json('query'),
      projection: req.json('projection'),
      sort: req.json('sort')
    };

    var db = req.mongo.db(req.params.database_name);
    if (!spec.query && !spec.sort && !spec.projection) {
      spec = {
        planCacheListQueryShapes: req.params.collection_name
      };
    }

    db.command(spec, function(err, data) {
      if (err) {
        return next(err);
      }
      res.send(data.shapes);
    });
  },
  destroy: function(req, res, next) {
    var db = req.mongo.db(req.params.database_name);
    db.dropCollection(req.params.collection_name, function(err) {
      if (err) {
        err.command = 'dropCollection';
        return next(err);
      }
      res.status(204).send();
    });
  },
  post: function(req, res, next) {
    var opts = {
      capped: req.boolean('capped'),
      size: req.int('size'),
      max: req.int('max'),
      strict: true
    };

    if (opts.capped && !(opts.size || opts.max)) {
      return next(boom.badRequest('Capped collections require `size` or `max`'));
    }

    if (opts.capped && (opts.size && opts.max)) {
      return next(boom.badRequest('`size` and `max` are mutually exclusive'));
    }
    debug('creating new collection', req.params.collection_name, opts);
    var db = req.mongo.db(req.params.database_name);
    db.createCollection(req.params.collection_name, opts, function(err) {
      if (err) {
        err.command = 'createCollection';
        return next(err);
      }

      res.status(201).send(_.extend(opts, {
        _id: req.params.database_name + '.' + req.params.collection_name,
        database: req.params.database_name
      }));
    });
  },
  put: function(req, res, next) {
    if (!req.body.name) {
      return next(boom.badRequest('Missing required `name`'));
    }

    var db = req.mongo.db(req.params.database_name);
    db.renameCollection(req.params.collection_name, req.body.name, function(err) {
      if (err) {
        err.command = 'renameCollection';
        return next(err);
      }

      res.send({
        name: req.body.name,
        database: req.params.database_name,
        _id: req.params.database_name + '.' + req.body.name
      });
    });
  }
};
