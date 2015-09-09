var State = require('ampersand-state');
// @see https://nodejs.org/docs/latest/api/url.html#url_url_format_urlobj
var url = require('url');

var Connection = State.extend({
  namespace: 'Connection',
  idAttribute: 'instance_id',
  props: {
    /**
     * User specified name for this connection.
     */
    name: {
      type: 'string',
      default: 'Local'
    },
    /**
     * `hostname:port` of the Instance in the Deployment we're connecting to.
     */
    instance_id: {
      type: 'string',
      default: 'localhost:27017'
    },
    mongodb_username: {
      type: 'string',
      default: null
    },
    mongodb_password: {
      type: 'string',
      default: null
    },
    auth_source: {
      type: 'string',
      default: null
    },
    // Note: GSSAPI = Kerberos
    auth_mechanism: {
      type: 'string',
      values: [null, 'SCRAM-SHA-1', 'MONGODB-CR', 'MONGODB-X509', 'GSSAPI', 'PLAIN'],
      default: null
    },
    gssapi_service_name: {
      type: 'string',
      default: null
    },

    /**
     * a.k.a `authdb`
     */
    database_name: {
      type: 'string',
      default: 'admin'
    },

    ssl: {
      type: 'boolean',
      default: false
    },
    ssl_validate: {
      type: 'boolean',
      default: false
    },
    ssl_ca: {
      type: 'array',
      default: null
    },
    ssl_cert: {
      type: 'string',
      default: null
    },
    ssl_key: {
      type: 'string',
      default: null
    },
    ssl_pass: {
      type: 'string',
      default: null
    }
  },

  validate: function(attrs) {
    if (attrs.auth_mechanism === 'GSSAPI') {
      if (!attrs.gssapi_service_name) {
        return new TypeError('The `gssapi_service_name` field is required when using GSSAPI as the auth mechanism.');
      }
    }

    if (attrs.gssapi_service_name) {
      if (attrs.auth_mechanism !== 'GSSAPI') {
        return new TypeError('The `gssapi_service_name` field does not apply when using '
          + attrs.auth_mechanism + ' as the auth mechanism.');
      }
    }

    if (!attrs.ssl) {
      if (attrs.ssl_validate) {
        return new TypeError('The `ssl_validate` field requires `ssl = true`.');
      }
      if (attrs.ssl_ca) {
        return new TypeError('The `ssl_ca` field requires `ssl = true`.');
      }
      if (attrs.ssl_cert) {
        return new TypeError('The `ssl_cert` field requires `ssl = true`.');
      }
      if (attrs.ssl_key) {
        return new TypeError('The `ssl_key` field requires `ssl = true`.');
      }
      if (attrs.ssl_pass) {
        return new TypeError('The `ssl_pass` field requires `ssl = true`.');
      }
    }
  },

  derived: {
    port: {
      deps: ['instance_id'],
      fn: function() {
        return parseInt(this.instance_id.split(':')[1], 10);
      }
    },
    hostname: {
      deps: ['instance_id'],
      fn: function() {
        this.instance_id = this.instance_id.replace('mongodb://', '');
        return this.instance_id.split(':')[0];
      }
    },
    // connection string
    uri: {
      deps: ['hostname', 'port', 'ssl', 'auth_source', 'auth_mechanism',
        'gssapi_service_name', 'mongodb_username', 'mongodb_password'],
      fn: function() {
        var urlObj = {
          protocol: 'mongodb',
          slashes: true,
          hostname: this.hostname,
          port: this.port,
          query: {
            slaveOk: 'true'
          }
        };

        if (this.mongodb_username && this.mongodb_password) {
          urlObj.auth = this.mongodb_username + ':' + this.mongodb_password;
        } else if (this.mongodb_username) {
          urlObj.auth = this.mongodb_username;
        }

        if (this.ssl) {
          urlObj.query.ssl = this.ssl;
        }
        if (this.auth_source) {
          urlObj.query.authSource = this.auth_source;
        }
        if (this.auth_mechanism) {
          urlObj.query.authMechanism = this.auth_mechanism;
        }
        if (this.auth_mechanism === 'GSSAPI') {
          urlObj.pathname = 'kerberos';
        }
        if (this.gssapi_service_name) {
          urlObj.query.gssapiServiceName = this.gssapi_service_name;
        }

        return url.format(urlObj);
      }
    },

    options: {
      deps: ['ssl_validate', 'ssl_ca', 'ssl_cert', 'ssl_key', 'ssl_pass'],
      fn: function() {
        var connectionOptions = {
          uri_decode_auth: true,
          connectWithNoPrimary: true,
          db: {},
          server: {},
          replSet: {},
          mongos: {}
        };

        if (this.ssl_validate) {
          connectionOptions.server.sslValidate = true;
        }
        if (this.ssl_ca) {
          connectionOptions.server.sslCA = this.ssl_ca;
        }
        if (this.ssl_cert) {
          connectionOptions.server.sslCert = this.ssl_cert;
        }
        if (this.ssl_key) {
          connectionOptions.server.sslKey = this.ssl_key;
        }
        if (this.ssl_pass) {
          connectionOptions.server.sslPass = this.ssl_pass;
        }
        return connectionOptions;
      }
    }
  }
});
module.exports = Connection;
