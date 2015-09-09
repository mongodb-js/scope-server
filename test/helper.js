/*eslint new-cap:0*/
process.env.NODE_ENV = 'testing';

var socketio = require('socket.io-client');
var ss = require('socket.io-stream');
var es = require('event-stream');
var http = require('http');
var supertest = require('supertest');
var assert = require('assert');
var EJSON = require('mongodb-extended-json');

var app = require('../');
var models = require('../lib/models');
var debug = require('debug')('scout-server:test:helper');
var instance = require('../lib/models/instance');
var getConnectionString = instance.getConnectionString;
var getConnectionOptions = instance.getConnectionOptions;

var defaults = {
  seed: 'mongodb://localhost:27017'
};

var ctx = {
  get: function(key) {
    return ctx[key] || defaults[key];
  },
  reset: function() {
    Object.keys(ctx).map(function(k) {
      if (typeof ctx[k] !== 'function') {
        return delete ctx[k];
      }
    });
    return ctx;
  }
};

var GET = function(path) {
  var req;
  debug('GET %s', path);
  req = supertest(app).get(path).accept('json');
  if (ctx.token) {
    req.set('Authorization', 'Bearer ' + ctx.token);
  }
  return req;
};

var POST = function(path) {
  var req;
  debug('POST %s', path);
  req = supertest(app).post(path).accept('json').type('json');
  if (ctx.token) {
    req.set('Authorization', 'Bearer ' + ctx.token);
  }
  return req;
};

var DELETE = function(path) {
  var req;
  debug('DELETE %s', path);
  req = supertest(app).del(path).accept('json');
  if (ctx.token) {
    req.set('Authorization', 'Bearer ' + ctx.token);
  }
  return req;
};

var PUT = function(path) {
  var req;
  debug('PUT %s', path);
  req = supertest(app).put(path).accept('json').type('json');
  if (ctx.token) {
    req.set('Authorization', 'Bearer ' + ctx.token);
  }
  return req;
};

var connect_to_socketio = function(done) {
  var server;
  server = http.createServer(app);
  return server.listen(0, function() {
    debug('Server listening...', server.address());
    debug('connecting to socket.io...');
    var url = 'http://127.0.0.0:' + server.address().port;
    var options = {
      timeout: 100,
      transports: ['websocket'],
      'force new connection': true
    };

    var io = socketio.connect(url, options)
      .on('connect', function() {
        debug('connected to socket.io');
        debug('authenticating socket.io transport...');
        io.emit('authenticate', {
          token: ctx.token
        });
      })
      .on('authenticated', done.bind(null, null, io))
      .on('error', done);
  });
};

var parse_ejson = es.map(function(buffer, done) {
  if (buffer.length === 0) {
    return done();
  }
  if (buffer[{
      0: 2
    }] === [10, 93, 10]) {
    return done();
  }
  buffer = buffer.slice(buffer[{
    0: 1
  }] === [91, 10] ? 2 : 3);
  return done(null, JSON.parse(buffer, EJSON.reviver));
});

var create_socketio_readable = function(io, channel, params) {
  var stream;
  stream = ss.createStream(io);
  ss(io).emit(channel, stream, params);
  return stream.pipe(parse_ejson);
};

/**
 * This function is used in authentication tests to verify that a connection_state
 * object  creates a valid connection URL and connection options object.
 * @param {Connection} connection - An object specifying all parameters for the db connection
 * @param {string} expectedURL - The URL that we expect to the connection to create
 * @param {object} expectedOptions - An object holding various options for the db connection
 * @param {function} done - Test Callback
 */
var verifyConnection = function(connection, expectedURL, expectedOptions, done) {
  getConnectionString(connection, function(err, url) {
    if (err) return done(err);
    assert.equal(url, expectedURL);
    getConnectionOptions(connection, function(err, options) {
      if (err) return done(err);
      assert.deepEqual(options, expectedOptions);
      done();
    });
  });
};

module.exports = {
  collections: {},
  GET: GET,
  POST: POST,
  DELETE: DELETE,
  PUT: PUT,
  ctx: ctx,
  verifyConnection: verifyConnection,
  create_socketio_readable: create_socketio_readable,
  connect_to_socketio: connect_to_socketio,
  beforeWith: function(context) {
    return function(done) {
      Object.keys(context).map(function(k) {
        ctx[k] = context[k];
      });
      module.exports.before(done);
    };
  },
  before: function(done) {
    var d;
    debug('running setup');
    d = {
      seed: ctx.get('seed')
    };
    debug('getting token for d %j', d);
    POST('/api/v1/token')
      .send(d)
      .expect(201)
      .expect('Content-Type', /json/).end(function(err, res) {
      if (err != null) {
        return done(err);
      }
      assert(res.body.token);
      ctx.token = res.body.token;
      debug('set token to', ctx.token);
      debug('setup complete');
      done();
    });
  },
  token: function() {
    return ctx.token;
  },
  after: function(done) {
    debug('tearing down');
    supertest(app).del('/api/v1/token')
      .accept('json')
      .set('Authorization', 'Bearer ' + ctx.token)
      .expect(200)
      .end(function(err) {
        if (err != null) {
          return done(err);
        }
        ctx.reset();
        models.clear(done);
      });
  }
};

module.exports.setup = module.exports.before;
module.exports.teardown = module.exports.after;

// ---
// generated by coffee-script 1.9.2
