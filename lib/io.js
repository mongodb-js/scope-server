/**
 * #####################################################################
 * WARNING: serious WIP ahead.  If your name isn't lucas, turn back now.
 * #####################################################################
 */
var app = require('./');
var io = module.exports = require('socket.io')(app.server);
var config = require('mongoscope-config');
var brain = require('scout-brain');
var ss = require('socket.io-stream');
var types = require('./models').types;
var debug = require('debug')('scout-server:io');
var async = require('async');

var createSampleStream = require('mongodb-collection-sample');
var EJSON = require('mongodb-extended-json');
var typedParams = require('./middleware/typed-params');


io.on('connection', require('socketio-jwt').authorize({
  secret: config.get('token:secret').toString('utf-8'),
  timeout: 15000
})).on('authenticated', function(socket) {
  debug('authenticated with token data', socket.decoded_token);
});

function prepare(socket, req, done) {
  debug('preparing socket.io request');
  req.params = {
    ns: req.ns,
    size: req.size,
    query: req.query,
    fields: req.fields,
    session_id: socket.decoded_token.session_id,
    deployment_id: socket.decoded_token.deployment_id
  };

  req.query = {};

  typedParams(req, {}, function() {
    var tasks = {};
    tasks.token = function(next) {
      brain.loadToken(socket.decoded_token, req, next);
    };
    if (req.params.ns) {
      tasks.ns = function(next) {
        var ns = types.ns(req.params.ns);
        req.params.database_name = ns.database;
        req.params.collection_name = ns.collection;
        next();
      };
    }

    if (Object.keys(tasks).length === 0) {
      return process.nextTick(function() {
        done();
      });
    }
    async.series(tasks, function(err) {
      debug('socket.io request now prepared');
      if (err) {
        return done(err);
      }
      done();
    });
  });
}

io.on('connection', function(socket) {
  ss(socket).on('collection:sample', function(stream, req) {
    debug('args', arguments);
    prepare(socket, req, function(err) {
      if (err) {
        return stream.emit('error', err);
      }
      debug('collection:sample got req %j', req.params);

      var db = req.mongo.db(req.params.database_name);
      createSampleStream(db, req.params.collection_name, {
        query: req.params.query || {},
        size: req.int('size', 5),
        fields: req.params.fields || false
      })
        .pipe(EJSON.createStringifyStream())
        .pipe(stream);
    });
  });
});
