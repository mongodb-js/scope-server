module.exports = function(req, res, next) {
  req.params.sample_options = {
    query: req.params.query,
    sort: req.params.sort,
    size: req.int('size', 100),
    fields: req.params.fields
  };
  next();
};
