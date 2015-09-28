var express = require('express');
var app = module.exports = express();
var versions = module.exports.versions = require('./versions');

var redirect = require('./middleware/redirect');
var ejson = require('./middleware/ejson-body-parser');
var token_required = require('./middleware/token-required');
var collection_required = require('./middleware/collection-required');
var database_required = require('./middleware/database-required');
var sample_options = require('./middleware/sample-options');
var health_check = require('./middleware/health-check');
var pkg = require('../package.json');

app.server = require('http').createServer(app);
app.config = require('mongoscope-config');

app.use(require('./middleware/watch-event-loop-blocking'));
app.use(require('./middleware/cors'));
app.use(require('./middleware/typed-params'));
app.use(require('./middleware/send-extended-json'));

app.get('/api', redirect('/api/v1'));
app.get('/api/v1', function(req, res) {
  res.send({
    message: 'Welcome to Scout',
    versions: versions
  });
});
app.get('/health-check', health_check());

/**
 * ## Route Param Triggers
 *
 * @see http://expressjs.com/api.html#app.param
 */
app.param('_id', require('./params/_id'));
app.param('ns', require('./params/ns'));
app.param('create_ns', require('./params/create-ns'));
app.param('database_name', require('./params/database-name'));
app.param('instance_id', require('./params/instance-id'));
app.param('deployment_id', require('./params/deployment-id'));

/**
 * ## token
 */
var token = require('./routes/token');
app.post('/api/v1/token', ejson, token.post);
app.delete('/api/v1/token', token_required, token.destroy);

/**
 * ## deployment
 */
var deployment = require('./routes/deployment');
app.get('/api/v1/deployments', token_required, deployment.list);
app.get('/api/v1/deployments/:deployment_id', token_required, deployment.get);

/**
 * ## instance
 */
var instance = require('./routes/instance');
app.get('/api/v1/:instance_id', token_required, instance.get);

/**
 * ## database
 */
var database = require('./routes/database');
app.post('/api/v1/:instance_id/databases', token_required, database.post);
app.get('/api/v1/:instance_id/databases/:database_name', token_required,
  database_required, database.get);
app.delete('/api/v1/:instance_id/databases/:database_name', token_required,
  database_required, database.destroy);

/**
 * ## collection
 */
var collection = require('./routes/collection');

app.post('/api/v1/:instance_id/collections/:create_ns',
  token_required, collection.post);

app.get('/api/v1/:instance_id/collections/:ns',
  token_required, collection_required, collection.get);

app.put('/api/v1/:instance_id/collections/:ns',
  token_required, collection_required, ejson, collection.put);
app.delete('/api/v1/:instance_id/collections/:ns',
  token_required, collection_required, collection.destroy);

app.get('/api/v1/:instance_id/collections/:ns/count',
  token_required, collection_required, collection.count);

app.get('/api/v1/:instance_id/collections/:ns/find',
  token_required, collection_required, collection.find);

app.get('/api/v1/:instance_id/collections/:ns/sample',
  token_required, collection_required, sample_options, collection.sample);

app.get('/api/v1/:instance_id/collections/:ns/aggregate',
  token_required, collection_required, collection.aggregate);

app.get('/api/v1/:instance_id/collections/:ns/distinct/:key',
  token_required, collection_required, collection.distinct);

app.get('/api/v1/:instance_id/collections/:ns/plans',
  token_required, collection_required, collection.plans);

app.post('/api/v1/:instance_id/collections/:ns/bulk',
  token_required, collection_required, ejson, collection.bulk);

/**
 * ## document
 */
var document = require('./routes/document');
app.post('/api/v1/:instance_id/documents/:ns',
  token_required, collection_required, ejson, document.create);

app.get('/api/v1/:instance_id/documents/:ns/:_id',
  token_required, collection_required, document.get);

app.delete('/api/v1/:instance_id/documents/:ns/:_id',
  token_required, collection_required, document.destroy);

app.put('/api/v1/:instance_id/documents/:ns/:_id',
  token_required, collection_required, ejson, document.update);

/**
 * ## index
 */
var _index = require('./routes/_index');
app.get('/api/v1/:instance_id/indexes/:ns',
  token_required, collection_required, _index.list);

app.post('/api/v1/:instance_id/indexes/:ns',
  token_required, collection_required, ejson, _index.create);

app.get('/api/v1/:instance_id/indexes/:ns/:index_name',
  token_required, collection_required, _index.get);

app.put('/api/v1/:instance_id/indexes/:ns/:index_name',
  token_required, collection_required, ejson, _index.update);

app.delete('/api/v1/:instance_id/indexes/:ns/:index_name',
  token_required, collection_required, _index.destroy);

/**
 * ## Error Handler
 */
var mongodbError = require('./mongodb-error');
/* eslint handle-callback-err: 0 */
app.use(function(err, req, res, next) {
  mongodbError.decode(function(err) {
    if (!err.isBoom) {
      // @todo (imlucas): `metrics.trackError(err)`
      console.error('Unknown Error - %s %s', req.method, req.url, err.stack);
      return next(err);
    }

    res.status(err.output.statusCode);

    var payload = err.output.payload;
    res.format({
      text: function() {
        res.send(payload.message);
      },
      json: function() {
        res.send(payload);
      }
    });
  });
});

/**
 * Serve the mongodb favicon when `/favicon.ico`
 * is requested.
 */
app.use(require('mongodb-favicon/express'));

/**
 * Setup socket.io
 */
require('./io').attach(app.server);

/**
 * @param {Object} opts - Placeholder
 * @param {Function} [fn] - Optional `error` and `listening` callback.
 */
module.exports.start = function(opts, fn) {
  if (typeof opts === 'function') {
    fn = opts;
    opts = {};
  }

  opts = opts || {};
  if (fn) {
    app.server.on('error', fn);
  }

  app.server.listen(app.config.get('port'), app.config.get('hostname'), function() {
    if (fn) {
      fn(null, app);
    }
  });
};
