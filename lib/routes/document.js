/**
 * TODO (imlucas): Needs cleanup and :axe: to `mongodb-document-model`.
 */
var boom = require('boom');

function getCollection(req) {
  return req.mongo.db(req.params.database_name)
    .collection(req.params.collection_name);
}

module.exports = {
  get: function(req, res, next) {
    var _id = req.params._id;
    if (!_id) {
      return next(boom.badRequest('Missing required `_id` param'));
    }

    var query = {
      _id: _id
    };

    getCollection(req).findOne(query, function(err, data) {
      if (err) {
        return next(err);
      }
      if (!data) {
        return next(boom.notFound('No documents with _id `' + _id + '`'));
      }
      res.status(200).send(data);
    });
  },
  create: function(req, res, next) {
    var doc = req.body || {};
    if (!doc._id) {
      return next(boom.badRequest('Missing required field `_id`'));
    }

    req.col.insert(doc, {}, function(err) {
      if (err) {
        return next(err);
      }
      res.status(201).send(doc);
    });
  },
  update: function(req, res, next) {
    var _id = req.params._id;
    if (!_id) {
      return next(boom.badRequest('No _id specified.'));
    }

    // TODO: support github.com/mongodb-js/jsonpatch-to-mongodb
    var update = {
      _id: _id
    };

    getCollection(req).update(update, req.body, function(err) {
      if (err) {
        return next(err);
      }
      res.status(200).send(req.body);
    });
  },
  destroy: function(req, res, next) {
    var _id = req.params._id;
    if (!_id) {
      return next(boom.badRequest('No _id specified.'));
    }

    // TODO (imlucas) handle types like so:
    //
    // - client sends /documents/5?type=$int
    // - client sends /documents/552e39c6f9b357645ac686a3?type=$oid
    var query = {
      _id: _id
    };

    var options = {
      single: true
    };

    var collection = getCollection(req);

    collection.findOne(query, function(err, doc) {
      if (err) {
        return next(err);
      }
      if (!doc) {
        return next(boom.notFound('No documents with _id `' + _id + '`'));
      }

      collection.remove(query, options, function(_err) {
        if (_err) {
          return next(_err);
        }
        res.status(200).send(doc);
      });
    });
  }
};
