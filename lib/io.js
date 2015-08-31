/**
 * #####################################################################
 * WARNING: serious WIP ahead.  If your name isn't lucas, turn back now.
 * #####################################################################
 */
var app = require('./');
var io = module.exports = require('socket.io')(app.server);
var config = require('mongoscope-config');
var ss = require('socket.io-stream');
var async = require('async');
var createSampleStream = require('mongodb-collection-sample');
var EJSON = require('mongodb-extended-json');
var typedParams = require('./middleware/typed-params');
var sample_options = require('./middleware/sample-options');
var createSampleStream = require('./streams/create-sample-stream');
var Token = require('./models/token');
var debug = require('debug')('scout-server:io');
var toNS = require('mongodb-ns');

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
    session_id: socket.decoded_token.session_id,
    deployment_id: socket.decoded_token.deployment_id
  };

  req.query = {};

  typedParams(req, {}, function() {
    var tasks = {};
    tasks.token = function(next) {
      Token.load(socket.decoded_token, req, next);
    };
    tasks.sample_options = function(next) {
      sample_options(req, {}, next);
    };
    if (req.params.ns) {
      tasks.ns = function(next) {
        var ns = toNS(req.params.ns);
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
    prepare(socket, req, function(err) {
      if (err) return stream.emit('error', err);

      debug('collection:sample got req %j', req.params);

      var db = req.mongo.db(req.params.database_name);
      createSampleStream(db, req.params.collection_name, req.params.sample_options)
        .pipe(EJSON.createStringifyStream())
        .pipe(stream);
    });
  });
});
