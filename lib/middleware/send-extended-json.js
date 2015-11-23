/**
 * Patches express responses to always use extended-json instead of normal json.
 *
 * @see http://expressjs.com/api.html#res.json
 */
var EJSON = require('mongodb-extended-json');
module.exports = function(req, res, next) {
  res.json = function(obj) {
    if (!this.get('Content-Type')) {
      this.set('Content-Type', 'application/json');
    }
    this.send(EJSON.stringify(obj, null, 2));
  };
  next();
};
