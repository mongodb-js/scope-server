var BaseConnection = require('mongodb-connection-model');
var omit = require('lodash').omit;

var Connection = BaseConnection.extend({
  session: {
    deployment: 'object'
  },
  extraProperties: 'reject',
  serialize: function() {
    var res = BaseConnection.prototype.serialize.call(this);
    return omit(res, 'mongodb_username', 'mongodb_username');
  }
});

module.exports = Connection;
