var BaseConnection = require('mongodb-connection-model');
var omit = require('lodash').omit;

var Connection = BaseConnection.extend({
  extraProperties: 'reject',
  serialize: function() {
    var res = BaseConnection.prototype.serialize.call(this);
    return omit(res, 'mongodb_username', 'mongodb_username');
  }
});

Connection.fromInstanceId = function(instance_id) {
  var p = instance_id.split(':');
  return new Connection({
    hostname: p[0],
    port: parseInt(p[1], 10)
  });
};

module.exports = Connection;
