var es = require('event-stream');
var _ = require('lodash');
var createReservoir = require('reservoir-stream');
var _idToDocument = require('./id-to-document');
var getKernelVersion = require('get-mongodb-version');
var semver = require('semver');
var debug = require('debug')('scout-server:streams:create-sample-stream');

// For pre 3.1.6 kernel
var $sampleShim = function(db, collection_name, opts) {
  var collection = db.collection(collection_name);
  var src;
  var cursor;
  var reservoir;
  var complete = false;

  var readable = es.readable(function(count, done) {
    if (src) {
      if (complete) {
        debug('complete');
        return this.emit('end');
      }
    } else {
      var self = this;
      collection.count(opts.query, function(err, count) {
        if (err) {
          return done(err);
        }

        debug('sampling %d documents from a collection with a population of %d documents',
          opts.size, count);

        src = collection.find(opts.query, {
          fields: {
            _id: 1
          },
          limit: 10000
        });

        cursor = src.stream()
          .on('error', self.emit.bind(self, 'error'));

        reservoir = createReservoir(opts.size)
          .on('error', self.emit.bind(self, 'error'))
          .on('data', function(doc) {
            debug('sampled _id', doc._id);
            self.emit('data', doc._id);
          })
          .on('end', function() {
            debug('sample complete');
            src.close();
            complete = true;
            done();
          });

        cursor.pipe(reservoir);
      });
    }
  });

  var loader = _idToDocument(db, collection_name, {
    fields: opts.fields
  });
  readable.pipe(loader);
  return loader;
};

/**
 * Take an `_id` and emit the source document.
 *
 * @param {mongodb.Db} db
 * @param {String} collection_name to source from.
 * @param {Object} [opts]
 * @option {Object} query to refine possible samples [default: `{}`].
 * @option {Number} size of the sample to capture [default: `5`].
 * @return {stream.Readable|void}
 * @api private
 */
module.exports = function createSampleStream(db, collection_name, opts) {
  opts = _.defaults(opts || {}, {
    query: {},
    size: 5,
    fields: null,
    sort: {
      $natural: -1
    },
    limit: undefined,
    skip: undefined
  });
  debug('args', {
    db: db.admin,
    collection_name: collection_name
  });
  debug('Using options %j', opts);
  getKernelVersion({
    db: db
  }, function(err, version) {
    debug('has native $sample?', semver.gte(version, '3.1.6'));
  });
  return $sampleShim(db, collection_name, opts);
};
