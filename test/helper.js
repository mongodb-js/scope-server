/* eslint new-cap:0 */
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

var ctx = {
  get: function(key) {
    return ctx[key];
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

module.exports = {
  collections: {},
  GET: GET,
  POST: POST,
  DELETE: DELETE,
  PUT: PUT,
  ctx: ctx,
  beforeWith: function(context) {
    return function(done) {
      Object.keys(context).map(function(k) {
        ctx[k] = context[k];
      });
      module.exports.before(done);
    };
  },
  before: function(done) {
    debug('getting token');
    POST('/api/v1/token')
      .send({})
      .expect(201)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
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
