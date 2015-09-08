var boom = require('boom');

/**
 * Common options that are passed to driver
 * methods which create cursors such as `collection.find`,
 * `collection.aggregate`, etc.
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {Function} next
 * @return {void}
 */
module.exports = function(req, res, next) {
  if (!req.params.cursor_options) {
    return next(boom.badImplementation(
      'The `cursor_options` middleware must be used before '
      + 'the `cursor` middleware.  '
      + '@see ./lib/middleware/cursor-options.js'));
  }

  if (!req.params.database_name || !req.params.collection_name) {
    return next(boom.badImplementation(
      'The `ns` param loader must be used before '
      + 'the `cursor` middleware.  @see ./lib/params/ns.js'));
  }

  var query = req.params.cursor_options.query;
  var db = req.mongo.db(req.params.database_name);
  var collection = db.collection(req.params.collection_name);
  req.cursor = collection.find(query, req.params.cursor_options);
  next();
};
