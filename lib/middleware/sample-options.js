var EJSON = require('mongodb-extended-json');

module.exports = function(req, res, next) {
  req.params.sample_options = {
    query: EJSON.deflate(req.params.query),
    sort: EJSON.deflate(req.params.sort),
    size: req.int('size', 5),
    fields: req.params.fields,
    start: req.params.start,
    skip: req.params.skip
  };
  next();
};
