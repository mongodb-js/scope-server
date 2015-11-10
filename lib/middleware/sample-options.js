module.exports = function(req, res, next) {
  req.params.sample_options = {
    query: req.json('query'),
    sort: req.json('sort'),
    size: req.int('size', 100),
    fields: req.params.fields,
    maxTimeMS: req.int('maxTimeMS')
  };
  next();
};
