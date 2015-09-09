/*eslint new-cap:0*/
var supertest = require('supertest');
var app = require('../');
var helper = require('./helper');
var setup = helper.setup;
var teardown = helper.teardown;
var assert = require('assert');
var mongodb = require('mongodb');
var async = require('async');

describe('Tokens', function() {
  before(function(done) {
    setup(function() {
      done();
    });
  });
  after(function(done) {
    teardown(function() {
      mongodb.MongoClient.connect('mongodb://localhost:27017/test', function(err, _db) {
        if (err) return done(err);
        var db = _db;
        async.series([function(callback) {
          db.dropCollection('dogs', callback);
        }
        ], function(err) {
          if (err) return done(err);
          done();
        });
      });
    });
  });

  it('should not allow us to create a collection without a token', function(done) {
    var POST = function(path) {
      var req;
      req = supertest(app).post(path).accept('json').type('json');
      return req;
    };
    POST('/api/v1/localhost:27017/collections/test.dogs')
      .expect(403)
      .end(done);
  });

  it('should not allow us to create a collection with a bad token', function(done) {
    var POST = function(path) {
      var req;
      req = supertest(app).post(path).accept('json').type('json');
      if (helper.ctx.token) {
        req.set('Authorization', 'Bearer ' + helper.ctx.token + 1);
      }
      return req;
    };
    POST('/api/v1/localhost:27017/collections/test.dogs')
      .expect(403)
      .end(done);
  });

  it('should allow us to create a collection with a token', function(done) {
    helper.POST('/api/v1/localhost:27017/collections/test.dogs')
      .expect(201)
      .end(done);
  });
});
