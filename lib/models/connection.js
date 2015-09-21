var BaseConnection = require('mongodb-connection-model');

/**
 * This models a connection to a Mongodb deployment.
 * It is used for collecting all connection related information
 * and packaging it in a connection string and object.
 */
var Connection = BaseConnection.extend({
  extraProperties: 'ignore'
});

Connection.fromInstanceId = function(instance_id) {
  var p = instance_id.split(':');
  return new Connection({
    hostname: p[0],
    port: parseInt(p[1], 10)
  });
};

module.exports = Connection;
