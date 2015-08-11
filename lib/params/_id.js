/**
 * ### `:_id`
 *
 * Sometimes `_id` needs casting (e.g. string->number).
 */
var debug = require('debug')('scout-server:params:_id');
var NUMBER_REGEX = /^\d+$/;

module.exports = function maybe_cast_id(req, res, next, raw) {
  debug('checking if `%j` needs casting', raw);
  if (raw && NUMBER_REGEX.test(raw)) {
    req.params._id = parseInt(raw, 10);
    debug('cast `%j` -> `%j`', raw, req.params._id);
  }
  next();
};
