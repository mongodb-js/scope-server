var es = require('event-stream');
var _ = require('underscore');
var createReservoir = require('reservoir-stream');
var debug = require('debug')('scout-server:streams:create-sample-stream');
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
    size: 5
  });

  var collection = db.collection(collection_name);
  var src;
  var cursor;
  var reservoir;
  var complete = false;

  return es.readable(function(count, done) {
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
};
