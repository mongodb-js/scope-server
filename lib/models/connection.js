var BaseConnection = require('mongodb-connection-model');

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
