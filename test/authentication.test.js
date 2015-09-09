/*eslint new-cap:0*/
var ConnectionState = require('../lib/models/connection_state');
var url = require('url');
var helper = require('./helper');
var verifyConnection = helper.verifyConnection;

/**
 * This file tests that the server authenticates itself properly to the database.
 * It tests that that the connection URL and connection options are created
 * properly for all of the different authentication features that a user may need.
 */
describe('Authentication', function() {
  describe('Basic Username/Password Strings', function() {
    it('should produce a good connection string with no auth', function(done) {
      var connection = new ConnectionState();
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        hostname: 'localhost',
        port: '27017',
        query: {
          slaveOk: true,
          authSource: 'admin'
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        db: {},
        server: {},
        replSet: {
          connectWithNoPrimary: true
        },
        mongos: {}
      };
      verifyConnection(connection, correctURL, correctOptions, done);
    });

    it('should produce a good connection string with no auth and a mongodb://', function(done) {
      var connection = new ConnectionState({
        instance_id: 'mongodb://localhost:27017'
      });
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        hostname: 'localhost',
        port: '27017',
        query: {
          slaveOk: true,
          authSource: 'admin'
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        db: {},
        server: {},
        replSet: {
          connectWithNoPrimary: true
        },
        mongos: {}
      };

      verifyConnection(connection, correctURL, correctOptions, done);
    });

    it('should produce a good connection string with MongoDB-CR', function(done) {
      var connection = new ConnectionState({
        mongodb_username: 'arlo',
        mongodb_password: 'dog'
      });
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
        db: {},
        server: {},
        replSet: {
          connectWithNoPrimary: true
        },
        mongos: {}
      };

      verifyConnection(connection, correctURL, correctOptions, done);
    });

    it('should produce a url encoded hostname', function(done) {
      var connection = new ConnectionState({
        mongodb_username: 'arlo',
        mongodb_password: 'dog',
        instance_id: 'scr@ppy:27017'
      });
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'arlo:dog',
        hostname: 'scr@ppy',
        port: '27017',
        query: {
          slaveOk: true,
          authSource: 'admin'
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        db: {},
        server: {},
        replSet: {
          connectWithNoPrimary: true
        },
        mongos: {}
      };

      verifyConnection(connection, correctURL, correctOptions, done);
    });

    it('should produce a url encoded username', function(done) {
      var connection = new ConnectionState({
        mongodb_username: 'my@rlo',
        mongodb_password: 'dog',
        instance_id: 'scrappy:27017'
      });
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'my@rlo:dog',
        hostname: 'scrappy',
        port: '27017',
        query: {
          slaveOk: true,
          authSource: 'admin'
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        db: {},
        server: {},
        replSet: {
          connectWithNoPrimary: true
        },
        mongos: {}
      };

      verifyConnection(connection, correctURL, correctOptions, done);
    });

    it('should produce a url encoded password', function(done) {
      var connection = new ConnectionState({
        mongodb_username: 'arlo',
        mongodb_password: 'd?g',
        instance_id: 'scrappy:27017'
      });
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'arlo:d?g',
        hostname: 'scrappy',
        port: '27017',
        query: {
          slaveOk: true,
          authSource: 'admin'
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        db: {},
        server: {},
        replSet: {
          connectWithNoPrimary: true
        },
        mongos: {}
      };

      verifyConnection(connection, correctURL, correctOptions, done);
    });

    it('should authenticate against another database indirectly', function(done) {
      var connection = new ConnectionState({
        mongodb_username: 'arlo',
        mongodb_password: 'dog',
        auth_source: 'admin'
      });
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
        db: {},
        server: {},
        replSet: {
          connectWithNoPrimary: true
        },
        mongos: {}
      };

      verifyConnection(connection, correctURL, correctOptions, done);
    });

    it('should url encode auth source', function(done) {
      var connection = new ConnectionState({
        mongodb_username: 'arlo',
        mongodb_password: 'dog',
        auth_source: '@dmin'
      });
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
        db: {},
        server: {},
        replSet: {
          connectWithNoPrimary: true
        },
        mongos: {}
      };

      verifyConnection(connection, correctURL, correctOptions, done);
    });
  });

  describe('Enterprise Auth', function() {
    var connection = new ConnectionState({
      mongodb_username: 'arlo',
      mongodb_password: 'dog',
      ssl: true
    });
    it('should connect using ssl', function(done) {
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'arlo:dog',
        hostname: 'localhost',
        port: '27017',
        query: {
          slaveOk: true,
          authSource: 'admin',
          ssl: true
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        db: {},
        server: {},
        replSet: {
          connectWithNoPrimary: true
        },
        mongos: {}
      };

      verifyConnection(connection, correctURL, correctOptions, done);
    });

    it('should connect using ssl with validation', function(done) {
      var connection = new ConnectionState({
        mongodb_username: 'arlo',
        mongodb_password: 'dog',
        ssl: true,
        ssl_validate: true
      });
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'arlo:dog',
        hostname: 'localhost',
        port: '27017',
        query: {
          slaveOk: true,
          authSource: 'admin',
          ssl: true
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        db: {},
        server: {
          sslValidate: true
        },
        replSet: {
          connectWithNoPrimary: true
        },
        mongos: {}
      };

      verifyConnection(connection, correctURL, correctOptions, done);
    });

    it('should connect using ssl with a CA', function(done) {
      var connection = new ConnectionState({
        mongodb_username: 'arlo',
        mongodb_password: 'dog',
        ssl: true,
        ssl_ca: ['ca1', 'ca2']
      });
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'arlo:dog',
        hostname: 'localhost',
        port: '27017',
        query: {
          slaveOk: true,
          authSource: 'admin',
          ssl: true
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        db: {},
        server: {
          sslCA: ['ca1', 'ca2']
        },
        replSet: {
          connectWithNoPrimary: true
        },
        mongos: {}
      };

      verifyConnection(connection, correctURL, correctOptions, done);
    });

    it('should connect using ssl with a cert', function(done) {
      var connection = new ConnectionState({
        mongodb_username: 'arlo',
        mongodb_password: 'dog',
        ssl: true,
        ssl_cert: 'cert'
      });
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'arlo:dog',
        hostname: 'localhost',
        port: '27017',
        query: {
          slaveOk: true,
          authSource: 'admin',
          ssl: true
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        db: {},
        server: {
          sslCert: 'cert'
        },
        replSet: {
          connectWithNoPrimary: true
        },
        mongos: {}
      };

      verifyConnection(connection, correctURL, correctOptions, done);
    });

    it('should connect using ssl with a key', function(done) {
      var connection = new ConnectionState({
        mongodb_username: 'arlo',
        mongodb_password: 'dog',
        ssl: true,
        ssl_private_key: 'key'
      });
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'arlo:dog',
        hostname: 'localhost',
        port: '27017',
        query: {
          slaveOk: true,
          authSource: 'admin',
          ssl: true
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        db: {},
        server: {
          sslKey: 'key'
        },
        replSet: {
          connectWithNoPrimary: true
        },
        mongos: {}
      };

      verifyConnection(connection, correctURL, correctOptions, done);
    });

    it('should connect using ssl with a password', function(done) {
      var connection = new ConnectionState({
        mongodb_username: 'arlo',
        mongodb_password: 'dog',
        ssl: true,
        ssl_private_key_password: 'pass'
      });
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'arlo:dog',
        hostname: 'localhost',
        port: '27017',
        query: {
          slaveOk: true,
          authSource: 'admin',
          ssl: true
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        db: {},
        server: {
          sslPass: 'pass'
        },
        replSet: {
          connectWithNoPrimary: true
        },
        mongos: {}
      };

      verifyConnection(connection, correctURL, correctOptions, done);
    });

    it('should connect using authmechanism', function(done) {
      var connection = new ConnectionState({
        mongodb_username: 'arlo',
        mongodb_password: 'dog',
        auth_mechanism: 'PLAIN'
      });
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'arlo:dog',
        hostname: 'localhost',
        port: '27017',
        query: {
          slaveOk: true,
          authSource: 'admin',
          authMechanism: 'PLAIN'
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        db: {},
        server: {},
        replSet: {
          connectWithNoPrimary: true
        },
        mongos: {}
      };

      verifyConnection(connection, correctURL, correctOptions, done);
    });

    it('should connect using only a username if provided', function(done) {
      var connection = new ConnectionState({
        mongodb_username: 'arlo',
        auth_mechanism: 'MONGODB-X509'
      });
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'arlo',
        hostname: 'localhost',
        port: '27017',
        query: {
          slaveOk: true,
          authSource: 'admin',
          authMechanism: 'MONGODB-X509'
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        db: {},
        server: {},
        replSet: {
          connectWithNoPrimary: true
        },
        mongos: {}
      };

      verifyConnection(connection, correctURL, correctOptions, done);
    });

    it('should connect using only a username and it should be urlencoded', function(done) {
      var connection = new ConnectionState({
        mongodb_username: '@rlo',
        auth_mechanism: 'MONGODB-X509'
      });
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: '@rlo',
        hostname: 'localhost',
        port: '27017',
        query: {
          slaveOk: true,
          authSource: 'admin',
          authMechanism: 'MONGODB-X509'
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        db: {},
        server: {},
        replSet: {
          connectWithNoPrimary: true
        },
        mongos: {}
      };

      verifyConnection(connection, correctURL, correctOptions, done);
    });

    it('should connect using authmechanism and gssapiServiceName', function(done) {
      var connection = new ConnectionState({
        mongodb_username: 'arlo',
        mongodb_password: 'dog',
        auth_mechanism: 'GSSAPI',
        gssapi_service_name: 'mongodb'
      });
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'arlo:dog',
        hostname: 'localhost',
        port: '27017',
        pathname: 'kerberos',
        query: {
          slaveOk: true,
          authSource: 'admin',
          authMechanism: 'GSSAPI',
          gssapiServiceName: 'mongodb'
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        db: {},
        server: {},
        replSet: {
          connectWithNoPrimary: true
        },
        mongos: {}
      };

      verifyConnection(connection, correctURL, correctOptions, done);
    });

    it('should connect using authmechanism and gssapiServiceName urlencoded', function(done) {
      var connection = new ConnectionState({
        mongodb_username: 'arlo',
        mongodb_password: 'dog',
        auth_mechanism: 'GSSAPI',
        gssapi_service_name: 'm@ngodb'
      });
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'arlo:dog',
        hostname: 'localhost',
        port: '27017',
        pathname: 'kerberos',
        query: {
          slaveOk: true,
          authSource: 'admin',
          authMechanism: 'GSSAPI',
          gssapiServiceName: 'm@ngodb'
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        db: {},
        server: {},
        replSet: {
          connectWithNoPrimary: true
        },
        mongos: {}
      };

      verifyConnection(connection, correctURL, correctOptions, done);
    });

    it('should work for standard kerberos', function(done) {
      var connection = new ConnectionState({
        instance_id: 'ldaptest.10gen.cc',
        mongodb_username: 'integrations@LDAPTEST.10GEN.CC',
        auth_mechanism: 'GSSAPI',
        gssapi_service_name: 'mongodb'
      });
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'integrations@LDAPTEST.10GEN.CC',
        hostname: 'ldaptest.10gen.cc',
        pathname: 'kerberos',
        query: {
          slaveOk: true,
          authSource: 'admin',
          authMechanism: 'GSSAPI',
          gssapiServiceName: 'mongodb'
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        db: {},
        server: {},
        replSet: {
          connectWithNoPrimary: true
        },
        mongos: {}
      };

      verifyConnection(connection, correctURL, correctOptions, done);
    });

    it('should work for standard kerberos with a password', function(done) {
      var connection = new ConnectionState({
        instance_id: 'ldaptest.10gen.cc',
        mongodb_username: 'integrations@LDAPTEST.10GEN.CC',
        mongodb_password: 'compass',
        auth_mechanism: 'GSSAPI',
        gssapi_service_name: 'mongodb'
      });
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'integrations@LDAPTEST.10GEN.CC:compass',
        hostname: 'ldaptest.10gen.cc',
        pathname: 'kerberos',
        query: {
          slaveOk: true,
          authSource: 'admin',
          authMechanism: 'GSSAPI',
          gssapiServiceName: 'mongodb'
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        db: {},
        server: {},
        replSet: {
          connectWithNoPrimary: true
        },
        mongos: {}
      };

      verifyConnection(connection, correctURL, correctOptions, done);
    });

    it('should work for standard kerberos with a password urlencoded', function(done) {
      var connection = new ConnectionState({
        instance_id: 'ldaptest.10gen.cc',
        mongodb_username: 'integrations@LDAPTEST.10GEN.CC',
        mongodb_password: 'comp@ss',
        auth_mechanism: 'GSSAPI',
        gssapi_service_name: 'mongodb'
      });
      var correctURL = url.format({
        protocol: 'mongodb',
        slashes: true,
        auth: 'integrations@LDAPTEST.10GEN.CC:comp@ss',
        hostname: 'ldaptest.10gen.cc',
        pathname: 'kerberos',
        query: {
          slaveOk: true,
          authSource: 'admin',
          authMechanism: 'GSSAPI',
          gssapiServiceName: 'mongodb'
        }
      });
      var correctOptions = {
        uri_decode_auth: true,
        db: {},
        server: {},
        replSet: {
          connectWithNoPrimary: true
        },
        mongos: {}
      };

      verifyConnection(connection, correctURL, correctOptions, done);
    });
  });
});
