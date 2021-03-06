/**
 * ### `:create_ns`
 *
 * In some cases we want to use a namespace string, but only really
 * the database side like when creating a new collection.
 */
var toNS = require('mongodb-ns');

module.exports = function unpack_param_create_ns(req, res, next, raw) {
  req.ns = toNS(raw);
  req.params.database_name = req.ns.database;
  req.params.collection_name = req.ns.collection;
  next();
};
