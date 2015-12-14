var boom = require('boom');
var ReadPreference = require('mongodb-read-preference');

/**
 * Makes sure you don't try and access collections
 * that don't already exist instead of automatically
 * creating them like the mongo shell.  This results
 * in not having a ton of collections that only exist
 * because of typos in user code.
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {Function} next
 * @return {void}
 */
module.exports = function(req, res, next) {
  if (!req.params.database_name || !req.params.collection_name) {
    return next(boom.badImplementation(
      'The `ns` param loader must be used before '
      + 'the `collection-required` middleware.  '
      + '@see ./lib/params/ns.js'));
  }

  req.db = req.mongo.db(req.params.database_name);
  req.db.collection(req.params.collection_name, {
    readPreference: ReadPreference.nearest,
    strict: true
  }, function(err, col) {
    if (err) {
      return next(err);
    }
    req.col = col;
    req.col.name = req.params.collection_name;
    next();
  });
};
