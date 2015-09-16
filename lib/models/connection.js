var BaseConnection = require('mongodb-connection-model');

var Connection = BaseConnection.extend({
  session: {
    deployment: 'object',
    seed: 'string'
  },
  extraProperties: 'reject'
});

module.exports = Connection;
