var State = require('ampersand-state');
// @see https://nodejs.org/docs/latest/api/url.html#url_url_format_urlobj
var url = require('url');
var assign = require('lodash.assign');

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
      values: ['SCRAM-SHA-1', 'MONGODB-CR', 'MONGODB-X509', 'GSSAPI', 'PLAIN'],
      default: null
    },
    gssapiServiceName: {
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
      type: 'string',
      values: ['false', 'prefer', 'true'],
      default: 'prefer'
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
    },

    derived: {
      use_auth: {
        deps: ['mongodb_username', 'mongodb_password'],
        fn: function() {
          return this.mongodb_username && this.mongodb_password;
        }
      },
      port: {
        deps: ['instance_id'],
        fn: function() {
          return parseInt(this.instance_id.split(':')[1], 10);
        }
      },
      hostname: {
        deps: ['instance_id'],
        fn: function() {
          return this.instance_id.split(':')[0];
        }
      },
      // connection string
      uri: {
        deps: ['use_auth', 'port', 'hostname'],
        fn: function() {
          var urlObj = {
            protocol: 'mongodb',
            slashes: true,
            hostname: this.hostname,
            port: this.port,
            query: {
              ssl: this.ssl,
              slaveOk: 'true'
            }
          };
          if (this.use_auth) {
            assign(urlObj, {
              username: encodeURIComponent(this.mongodb_username),
              password: encodeURIComponent(this.mongodb_password)
            });
          }
          return url.format(urlObj);
        }
      }
    }
  }
});
module.exports = Connection;