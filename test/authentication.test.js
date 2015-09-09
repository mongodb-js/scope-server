/*eslint new-cap:0*/
var supertest = require('supertest');
var app = require('../');
var helper = require('./helper');
var setup = helper.setup;
var teardown = helper.teardown;
var instance = require('../lib/models/instance');
var getConnectionString = instance.getConnectionString;
var getConnectionOptions = instance.getConnectionOptions;
var assert = require('assert');
var mongodb = require('mongodb');
var async = require('async');
var connectionState = require('../lib/models/connection_state');
var url = require('url');


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
      var connection = new connectionState();
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        hostname: 'localhost',
        port: '27017',
        query: {
          slaveOk: true
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        connectWithNoPrimary: true,
        db: {},
        server: {},
        replSet: {},
        mongos: {}
      };
      getConnectionString(connection, function(err, url) {
        if (err) return done(err);
        assert.equal(url, correctURL);
        getConnectionOptions(connection, function(err, options) {
          if (err) return done(err);
          assert.deepEqual(options, correctOptions);
          done();
        });
      });
    });

    it('should produce a good connection string with no auth and a mongodb://', function(done) {
      var connection = new connectionState();
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        hostname: 'localhost',
        port: '27017',
        query: {
          slaveOk: true
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        connectWithNoPrimary: true,
        db: {},
        server: {},
        replSet: {},
        mongos: {}
      };

      connection.instance_id = 'mongodb://localhost:27017';

      getConnectionString(connection, function(err, url) {
        if (err) return done(err);
        assert.equal(url, correctURL);
        getConnectionOptions(connection, function(err, options) {
          if (err) return done(err);
          assert.deepEqual(options, correctOptions);
          done();
        });
      });
    });

    it('should produce a good connection string with MongoDB-CR', function(done) {
      var connection = new connectionState();
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'arlo:dog',
        hostname: 'localhost',
        port: '27017',
        query: {
          slaveOk: true
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        connectWithNoPrimary: true,
        db: {},
        server: {},
        replSet: {},
        mongos: {}
      };

      connection.mongodb_username = 'arlo';
      connection.mongodb_password = 'dog';

      getConnectionString(connection, function(err, url) {
        if (err) return done(err);
        assert.equal(url, correctURL);
        getConnectionOptions(connection, function(err, options) {
          if (err) return done(err);
          assert.deepEqual(options, correctOptions);
          done();
        });
      });
    });

    it('should produce a url encoded hostname', function(done) {
      var connection = new connectionState();
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'arlo:dog',
        hostname: 'scr@ppy',
        port: '27017',
        query: {
          slaveOk: true
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        connectWithNoPrimary: true,
        db: {},
        server: {},
        replSet: {},
        mongos: {}
      };

      connection.mongodb_username = 'arlo';
      connection.mongodb_password = 'dog';
      connection.instance_id = 'scr@ppy:27017';

      getConnectionString(connection, function(err, url) {
        if (err) return done(err);
        assert.equal(url, correctURL);
        getConnectionOptions(connection, function(err, options) {
          if (err) return done(err);
          assert.deepEqual(options, correctOptions);
          done();
        });
      });
    });

    it('should produce a url encoded username', function(done) {
      var connection = new connectionState();
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'my@rlo:dog',
        hostname: 'scrappy',
        port: '27017',
        query: {
          slaveOk: true
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        connectWithNoPrimary: true,
        db: {},
        server: {},
        replSet: {},
        mongos: {}
      };

      connection.mongodb_username = 'my@rlo';
      connection.mongodb_password = 'dog';
      connection.instance_id = 'scrappy:27017';

      getConnectionString(connection, function(err, url) {
        if (err) return done(err);
        assert.equal(url, correctURL);
        getConnectionOptions(connection, function(err, options) {
          if (err) return done(err);
          assert.deepEqual(options, correctOptions);
          done();
        });
      });
    });

    it('should produce a url encoded password', function(done) {
      var connection = new connectionState();
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'arlo:d?g',
        hostname: 'scrappy',
        port: '27017',
        query: {
          slaveOk: true
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        connectWithNoPrimary: true,
        db: {},
        server: {},
        replSet: {},
        mongos: {}
      };

      connection.mongodb_username = 'arlo';
      connection.mongodb_password = 'd?g';
      connection.instance_id = 'scrappy:27017';

      getConnectionString(connection, function(err, url) {
        if (err) return done(err);
        assert.equal(url, correctURL);
        getConnectionOptions(connection, function(err, options) {
          if (err) return done(err);
          assert.deepEqual(options, correctOptions);
          done();
        });
      });
    });

    it('should authenticate against another database indirectly', function(done) {
      var connection = new connectionState();
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'arlo:dog',
        hostname: 'localhost',
        port: '27017',
        query: {
          slaveOk: true,
          authSource: 'admin'
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        connectWithNoPrimary: true,
        db: {},
        server: {},
        replSet: {},
        mongos: {}
      };

      connection.mongodb_username = 'arlo';
      connection.mongodb_password = 'dog';
      connection.auth_source = 'admin';

      getConnectionString(connection, function(err, url) {
        if (err) return done(err);
        assert.equal(url, correctURL);
        getConnectionOptions(connection, function(err, options) {
          if (err) return done(err);
          assert.deepEqual(options, correctOptions);
          done();
        });
      });
    });

    it('should url encode auth source', function(done) {
      var connection = new connectionState();
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'arlo:dog',
        hostname: 'localhost',
        port: '27017',
        query: {
          slaveOk: true,
          authSource: '@dmin'
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        connectWithNoPrimary: true,
        db: {},
        server: {},
        replSet: {},
        mongos: {}
      };

      connection.mongodb_username = 'arlo';
      connection.mongodb_password = 'dog';
      connection.auth_source = '@dmin';

      getConnectionString(connection, function(err, url) {
        if (err) return done(err);
        assert.equal(url, correctURL);
        getConnectionOptions(connection, function(err, options) {
          if (err) return done(err);
          assert.deepEqual(options, correctOptions);
          done();
        });
      });
    });
  });

  describe('Enterprise Auth', function() {
    var connection = new connectionState();
    it('should connect using ssl', function(done) {
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'arlo:dog',
        hostname: 'localhost',
        port: '27017',
        query: {
          slaveOk: true,
          ssl: true
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        connectWithNoPrimary: true,
        db: {},
        server: {},
        replSet: {},
        mongos: {}
      };

      connection.mongodb_username = 'arlo';
      connection.mongodb_password = 'dog';
      connection.ssl = true;

      getConnectionString(connection, function(err, url) {
        if (err) return done(err);
        assert.equal(url, correctURL);
        getConnectionOptions(connection, function(err, options) {
          if (err) return done(err);
          assert.deepEqual(options, correctOptions);
          done();
        });
      });
    });

    it('should connect using ssl with validation', function(done) {
      var connection = new connectionState();
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'arlo:dog',
        hostname: 'localhost',
        port: '27017',
        query: {
          slaveOk: true,
          ssl: true
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        connectWithNoPrimary: true,
        db: {},
        server: {
          sslValidate: true
        },
        replSet: {},
        mongos: {}
      };

      connection.mongodb_username = 'arlo';
      connection.mongodb_password = 'dog';
      connection.ssl = true;
      connection.ssl_validate = true;

      getConnectionString(connection, function(err, url) {
        if (err) return done(err);
        assert.equal(url, correctURL);
        getConnectionOptions(connection, function(err, options) {
          if (err) return done(err);
          assert.deepEqual(options, correctOptions);
          done();
        });
      });
    });

    it('should connect using ssl with a CA', function(done) {
      var connection = new connectionState();
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'arlo:dog',
        hostname: 'localhost',
        port: '27017',
        query: {
          slaveOk: true,
          ssl: true
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        connectWithNoPrimary: true,
        db: {},
        server: {
          sslCA: ['ca1', 'ca2']
        },
        replSet: {},
        mongos: {}
      };

      connection.mongodb_username = 'arlo';
      connection.mongodb_password = 'dog';
      connection.ssl = true;
      connection.ssl_ca = ['ca1', 'ca2'];

      getConnectionString(connection, function(err, url) {
        if (err) return done(err);
        assert.equal(url, correctURL);
        getConnectionOptions(connection, function(err, options) {
          if (err) return done(err);
          assert.deepEqual(options, correctOptions);
          done();
        });
      });
    });

    it('should connect using ssl with a cert', function(done) {
      var connection = new connectionState();
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'arlo:dog',
        hostname: 'localhost',
        port: '27017',
        query: {
          slaveOk: true,
          ssl: true
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        connectWithNoPrimary: true,
        db: {},
        server: {
          sslCert: 'cert'
        },
        replSet: {},
        mongos: {}
      };

      connection.mongodb_username = 'arlo';
      connection.mongodb_password = 'dog';
      connection.ssl = true;
      connection.ssl_cert = 'cert';

      getConnectionString(connection, function(err, url) {
        if (err) return done(err);
        assert.equal(url, correctURL);
        getConnectionOptions(connection, function(err, options) {
          if (err) return done(err);
          assert.deepEqual(options, correctOptions);
          done();
        });
      });
    });

    it('should connect using ssl with a key', function(done) {
      var connection = new connectionState();
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'arlo:dog',
        hostname: 'localhost',
        port: '27017',
        query: {
          slaveOk: true,
          ssl: true
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        connectWithNoPrimary: true,
        db: {},
        server: {
          sslKey: 'key'
        },
        replSet: {},
        mongos: {}
      };

      connection.mongodb_username = 'arlo';
      connection.mongodb_password = 'dog';
      connection.ssl = true;
      connection.ssl_key = 'key';

      getConnectionString(connection, function(err, url) {
        if (err) return done(err);
        assert.equal(url, correctURL);
        getConnectionOptions(connection, function(err, options) {
          if (err) return done(err);
          assert.deepEqual(options, correctOptions);
          done();
        });
      });
    });

    it('should connect using ssl with a password', function(done) {
      var connection = new connectionState();
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'arlo:dog',
        hostname: 'localhost',
        port: '27017',
        query: {
          slaveOk: true,
          ssl: true
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        connectWithNoPrimary: true,
        db: {},
        server: {
          sslPass: 'pass'
        },
        replSet: {},
        mongos: {}
      };

      connection.mongodb_username = 'arlo';
      connection.mongodb_password = 'dog';
      connection.ssl = true;
      connection.ssl_pass = 'pass';

      getConnectionString(connection, function(err, url) {
        if (err) return done(err);
        assert.equal(url, correctURL);
        getConnectionOptions(connection, function(err, options) {
          if (err) return done(err);
          assert.deepEqual(options, correctOptions);
          done();
        });
      });
    });

    it('should connect using authmechanism', function(done) {
      var connection = new connectionState();
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'arlo:dog',
        hostname: 'localhost',
        port: '27017',
        query: {
          slaveOk: true,
          authMechanism: 'PLAIN'
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        connectWithNoPrimary: true,
        db: {},
        server: {},
        replSet: {},
        mongos: {}
      };

      connection.mongodb_username = 'arlo';
      connection.mongodb_password = 'dog';
      connection.auth_mechanism = 'PLAIN';

      getConnectionString(connection, function(err, url) {
        if (err) return done(err);
        assert.equal(url, correctURL);
        getConnectionOptions(connection, function(err, options) {
          if (err) return done(err);
          assert.deepEqual(options, correctOptions);
          done();
        });
      });
    });

    it('should connect using only a username if provided', function(done) {
      var connection = new connectionState();
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'arlo',
        hostname: 'localhost',
        port: '27017',
        query: {
          slaveOk: true,
          authMechanism: 'MONGODB-X509'
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        connectWithNoPrimary: true,
        db: {},
        server: {},
        replSet: {},
        mongos: {}
      };

      connection.mongodb_username = 'arlo';
      connection.auth_mechanism = 'MONGODB-X509';

      getConnectionString(connection, function(err, url) {
        if (err) return done(err);
        assert.equal(url, correctURL);
        getConnectionOptions(connection, function(err, options) {
          if (err) return done(err);
          assert.deepEqual(options, correctOptions);
          done();
        });
      });
    });

    it('should connect using only a username and it should be urlencoded', function(done) {
      var connection = new connectionState();
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: '@rlo',
        hostname: 'localhost',
        port: '27017',
        query: {
          slaveOk: true,
          authMechanism: 'MONGODB-X509'
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        connectWithNoPrimary: true,
        db: {},
        server: {},
        replSet: {},
        mongos: {}
      };

      connection.mongodb_username = '@rlo';
      connection.auth_mechanism = 'MONGODB-X509';

      getConnectionString(connection, function(err, url) {
        if (err) return done(err);
        assert.equal(url, correctURL);
        getConnectionOptions(connection, function(err, options) {
          if (err) return done(err);
          assert.deepEqual(options, correctOptions);
          done();
        });
      });
    });

    it('should connect using authmechanism and gssapiServiceName', function(done) {
      var connection = new connectionState();
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'arlo:dog',
        hostname: 'localhost',
        port: '27017',
        pathname: 'kerberos',
        query: {
          slaveOk: true,
          authMechanism: 'GSSAPI',
          gssapiServiceName: 'mongodb'
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        connectWithNoPrimary: true,
        db: {},
        server: {},
        replSet: {},
        mongos: {}
      };

      connection.mongodb_username = 'arlo';
      connection.mongodb_password = 'dog';
      connection.auth_mechanism = 'GSSAPI';
      connection.gssapi_service_name = 'mongodb';

      getConnectionString(connection, function(err, url) {
        if (err) return done(err);
        assert.equal(url, correctURL);
        getConnectionOptions(connection, function(err, options) {
          if (err) return done(err);
          assert.deepEqual(options, correctOptions);
          done();
        });
      });
    });

    it('should connect using authmechanism and gssapiServiceName urlencoded', function(done) {
      var connection = new connectionState();
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'arlo:dog',
        hostname: 'localhost',
        port: '27017',
        pathname: 'kerberos',
        query: {
          slaveOk: true,
          authMechanism: 'GSSAPI',
          gssapiServiceName: 'm@ngodb'
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        connectWithNoPrimary: true,
        db: {},
        server: {},
        replSet: {},
        mongos: {}
      };

      connection.mongodb_username = 'arlo';
      connection.mongodb_password = 'dog';
      connection.auth_mechanism = 'GSSAPI';
      connection.gssapi_service_name = 'm@ngodb';

      getConnectionString(connection, function(err, url) {
        if (err) return done(err);
        assert.equal(url, correctURL);
        getConnectionOptions(connection, function(err, options) {
          if (err) return done(err);
          assert.deepEqual(options, correctOptions);
          done();
        });
      });
    });

    it('should work for standard kerberos', function(done) {
      var connection = new connectionState();
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'integrations@LDAPTEST.10GEN.CC',
        hostname: 'ldaptest.10gen.cc',
        pathname: 'kerberos',
        query: {
          slaveOk: true,
          authMechanism: 'GSSAPI',
          gssapiServiceName: 'mongodb'
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        connectWithNoPrimary: true,
        db: {},
        server: {},
        replSet: {},
        mongos: {}
      };

      connection.instance_id = 'ldaptest.10gen.cc';
      connection.mongodb_username = 'integrations@LDAPTEST.10GEN.CC';
      connection.auth_mechanism = 'GSSAPI';
      connection.gssapi_service_name = 'mongodb';

      getConnectionString(connection, function(err, url) {
        if (err) return done(err);
        assert.equal(url, correctURL);
        getConnectionOptions(connection, function(err, options) {
          if (err) return done(err);
          assert.deepEqual(options, correctOptions);
          done();
        });
      });
    });

    it('should work for standard kerberos with a password', function(done) {
      var connection = new connectionState();
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'integrations@LDAPTEST.10GEN.CC:compass',
        hostname: 'ldaptest.10gen.cc',
        pathname: 'kerberos',
        query: {
          slaveOk: true,
          authMechanism: 'GSSAPI',
          gssapiServiceName: 'mongodb'
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        connectWithNoPrimary: true,
        db: {},
        server: {},
        replSet: {},
        mongos: {}
      };

      connection.instance_id = 'ldaptest.10gen.cc';
      connection.mongodb_username = 'integrations@LDAPTEST.10GEN.CC';
      connection.mongodb_password = 'compass';
      connection.auth_mechanism = 'GSSAPI';
      connection.gssapi_service_name = 'mongodb';

      getConnectionString(connection, function(err, url) {
        if (err) return done(err);
        assert.equal(url, correctURL);
        getConnectionOptions(connection, function(err, options) {
          if (err) return done(err);
          assert.deepEqual(options, correctOptions);
          done();
        });
      });
    });

    it('should work for standard kerberos with a password urlencoded', function(done) {
      var connection = new connectionState();
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'integrations@LDAPTEST.10GEN.CC:comp@ss',
        hostname: 'ldaptest.10gen.cc',
        pathname: 'kerberos',
        query: {
          slaveOk: true,
          authMechanism: 'GSSAPI',
          gssapiServiceName: 'mongodb'
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        connectWithNoPrimary: true,
        db: {},
        server: {},
        replSet: {},
        mongos: {}
      };

      connection.instance_id = 'ldaptest.10gen.cc';
      connection.mongodb_username = 'integrations@LDAPTEST.10GEN.CC';
      connection.mongodb_password = 'comp@ss';
      connection.auth_mechanism = 'GSSAPI';
      connection.gssapi_service_name = 'mongodb';

      getConnectionString(connection, function(err, url) {
        if (err) return done(err);
        assert.equal(url, correctURL);
        getConnectionOptions(connection, function(err, options) {
          if (err) return done(err);
          assert.deepEqual(options, correctOptions);
          done();
        });
      });
    });
  });
});
