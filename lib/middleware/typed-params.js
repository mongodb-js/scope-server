/**
 * Adds extra getters to `req` that are type aware.
 */
var EJSON = require('mongodb-extended-json');
var _ = require('lodash');
var isString = _.isString;

// Because req.param() was deprecated.
function _param(req, key, _default) {
  var src = req.params[key];
  if (src === undefined) {
    src = req.body[key];
  }
  if (src === undefined) {
    src = req.query[key];
  }
  if (src === undefined) {
    src = _default;
  }
  return src;
}

module.exports = function(req, res, next) {
  req.body = req.body || {};
  req.json = function(key, _default) {
    _default = _default || 'null';
    var value = _param(req, key, _default);
    if (isString(value)) {
      return EJSON.parse(value);
    }
    // socket.io has already done JSON.parse
    // so just deflate any values into proper
    // BSON instances.
    return EJSON.deserialize(value);
  };

  req.int = function(key, _default) {
    _default = _default || 0;
    return parseInt(_param(req, key, _default), 10);
  };

  req.boolean = function(key, _default) {
    return req.int(key, _default) === 1;
  };
  next();
};
