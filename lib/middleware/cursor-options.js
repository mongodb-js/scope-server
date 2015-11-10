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
  req.params.cursor_options = {
    query: req.json('query', '{}'),
    skip: Math.max(0, req.int('skip', 0)),
    limit: req.int('limit', 0),
    sort: req.json('sort', 'null'),
    explain: req.boolean('explain', false),
    fields: req.json('fields', 'null'),
    maxTimeMS: req.int('maxTimeMS')
  };
  next();
};
