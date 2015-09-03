/*eslint new-cap:0*/
var supertest = require('supertest');
var app = require('../');
var helper = require('./helper');
var setup = helper.setup;
var teardown = helper.teardown;
var instance = require('../lib/models/instance');
var getConnectionString = instance.getConnectionString;
var assert = require('assert');
var mongodb = require('mongodb');
var async = require('async');


describe('Authentication', function() {
  before(function(done) {
    setup(function() {
      done();
    });
  });
  after(function(done) {
    teardown(function() {
      done();
    });
  });

  describe('Tokens', function() {
    after(function(done) {
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

  describe('Basic Username/Password Strings', function() {
    it('should produce a good connection string with no auth', function(done) {
      var instance_id = 'mongodb://localhost:27017';
      var opts = {};
      getConnectionString(instance_id, opts, function(err, url) {
        if (err) return done(err);
        assert.equal(url, 'mongodb://localhost:27017?slaveOk=true');
        done();
      });
    });

    it('should produce a good connection string with no auth and no mongodb://', function(done) {
      var instance_id = 'localhost:27017';
      var opts = {};
      getConnectionString(instance_id, opts, function(err, url) {
        if (err) return done(err);
        assert.equal(url, 'mongodb://localhost:27017?slaveOk=true');
        done();
      });
    });

    it('should produce a good connection string with MongoDB-CR', function(done) {
      var instance_id = 'localhost:27017';
      var opts = {
        auth: {
          mongodb: {
            username: 'arlo',
            password: 'dog'
          }
        }
      };
      getConnectionString(instance_id, opts, function(err, url) {
        if (err) return done(err);
        assert.equal(url, 'mongodb://arlo:dog@localhost:27017?slaveOk=true');
        done();
      });
    });

    it('should produce a url encoded string', function(done) {
      var instance_id = 'scr@ppy:27017';
      var opts = {
        auth: {
          mongodb: {
            username: 'my@rlo',
            password: 'd?g'
          }
        }
      };
      getConnectionString(instance_id, opts, function(err, url) {
        if (err) return done(err);
        assert.equal(url, 'mongodb://my%40rlo:d%3fg@scr%40ppy:27017?slaveOk=true');
        done();
      });
    });

    it('should work for replica sets too', function(done) {
      var instances = ['localhost:27017', 'localhost:27018'];
      var opts = {
        auth: {
          mongodb: {
            username: 'arlo',
            password: 'dog'
          }
        },
        replicaSet: 'rs0'
      };
      getConnectionString(instances, opts, function(err, url) {
        if (err) return done(err);
        assert.equal(url, 'mongodb://arlo:dog@localhost:27017,localhost:27018?slaveOk=true&replicaSet=rs0');
        done();
      });
    });

    it('should make sure replica sets also url encode', function(done) {
      var instances = ['localho$t:27017', 'localhost:27018'];
      var opts = {
        auth: {
          mongodb: {
            username: 'arlo',
            password: 'dog'
          }
        },
        replicaSet: 'r$0'
      };
      getConnectionString(instances, opts, function(err, url) {
        if (err) return done(err);
        assert.equal(url, 'mongodb://arlo:dog@localho%24t:27017,localhost:27018?slaveOk=true&replicaSet=r%240');
        done();
      });
    });

    it('should authenticate against another database indirectly', function(done) {
      var instance_id = 'localhost:27017';
      var opts = {
        auth: {
          mongodb: {
            username: 'arlo',
            password: 'dog'
          }
        },
        authSource: 'admin'
      };
      getConnectionString(instance_id, opts, function(err, url) {
        if (err) return done(err);
        assert.equal(url, 'mongodb://arlo:dog@localhost:27017?slaveOk=true&authSource=admin');
        done();
      });
    });

    it('should url encode auth source', function(done) {
      var instance_id = 'localhost:27017';
      var opts = {
        auth: {
          mongodb: {
            username: 'arlo',
            password: 'dog'
          }
        },
        authSource: 'admin'
      };
      getConnectionString(instance_id, opts, function(err, url) {
        if (err) return done(err);
        assert.equal(url, 'mongodb://arlo:dog@localhost:27017?slaveOk=true&authSource=%40dmin');
        done();
      });
    });
  });

  describe('Enterprise Auth', function() {
    it('should connect using ssl', function(done) {
      var instance_id = 'localhost:27017';
      var opts = {
        auth: {
          mongodb: {
            username: 'arlo',
            password: 'dog'
          }
        },
        ssl: 1
      };
      getConnectionString(instance_id, opts, function(err, url) {
        if (err) return done(err);
        assert.equal(url, 'mongodb://arlo:dog@localhost:27017?slaveOk=true&ssl=true');
        done();
      });
    });
  });
});
