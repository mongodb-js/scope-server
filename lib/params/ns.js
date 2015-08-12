/**
 * ### `:ns`
 *
 * Validates and unpacks any namespace string's `:ns` in a URL using
 * `database_name` and `collection_name` below to provide even more
 * validation and autoloading from the driver.
 */
var toNS = require('mongodb-ns');

module.exports = function unpack_param_ns(req, res, next, raw) {
  req.ns = toNS(raw);
  req.params.database_name = req.ns.database;
  req.params.collection_name = req.ns.collection;
  next();
};
