/* eslint new-cap:0 */
/**
 * @todo (imlucas): If we add this as a `--require`
 * option to mocha config, tests will be much cleaner
 * as everything on exports will be a global?
 */
process.env.NODE_ENV = 'testing';

var supertest = require('supertest');
var assert = require('assert');
var app = require('../');
var models = require('../lib/models');
var format = require('util').format;
var _connect = require('mongodb-connection-model').connect;
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

exports.token = function() {
  return ctx.token;
};

exports.addAuthorization = function(req) {
  var token = exports.token();
  if (token) {
    req.set('Authorization', 'Bearer ' + token);
  }
  return req;
};

exports.GET = function(path) {
  var req;
  debug('GET %s', path);
  req = supertest(app).get(path).accept('json');
  exports.addAuthorization(req);
  return req;
};

exports.POST = function(path) {
  var req;
  debug('POST %s', path);
  req = supertest(app).post(path).accept('json').type('json');
  exports.addAuthorization(req);
  return req;
};

exports.DELETE = function(path) {
  var req;
  debug('DELETE %s', path);
  req = supertest(app).del(path).accept('json');
  exports.addAuthorization(req);
  return req;
};

exports.PUT = function(path) {
  var req;
  debug('PUT %s', path);
  req = supertest(app).put(path).accept('json').type('json');
  exports.addAuthorization(req);
  return req;
};

exports.before = exports.setup = function(done) {
  debug('setting up');
  exports.POST('/api/v1/token')
    .send({})
    .expect(201)
    .expect('Content-Type', /json/)
    .end(function(err, res) {
      if (err) {
        return done(err);
      }
      assert(res.body.token);
      ctx.token = res.body.token;
      debug('create token returned', res.body);
      debug('setup complete');
      done();
    });
};

function cleanup(done) {
  ctx.reset();
  models.clear(function() {
    debug('teardown complete');
    done();
  });
}

exports.after = exports.teardown = function(done) {
  debug('tearing down');
  if (!ctx.token) {
    return cleanup(done);
  }

  var req = supertest(app).del('/api/v1/token')
    .accept('json')
    .expect(200);
  exports.addAuthorization(req);
  req.end(function(err) {
    if (!err) {
      return done(err);
    }
    cleanup(done);
  });
};

exports.topology = process.env.MONGODB_TOPOLOGY || 'standalone';

exports.when_topology_is = function(topology, fn) {
  return describe(format('When the topology is %s', topology), function() {
    before(function() {
      if (exports.topology !== topology) {
        return this.skip(format('test requires topology `%s`', topology));
      }
    });
    return fn();
  });
};

exports.connect = function(done, fn) {
  var opts = {
    hostname: 'localhost',
    port: 27017
  };
  _connect(opts, function(err, conn) {
    if (err) {
      return done(err);
    }

    var db = conn.db('test');
    fn(db);
  });
};

module.exports = exports;
