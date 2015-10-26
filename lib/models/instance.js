/**
 * @todo (imlucas): :axe: to `mongodb-instance-model`.
 */
var _ = require('lodash');
var connect = require('mongodb-connection-model').connect;
var BaseInstance = require('mongodb-instance-model');

var Instance = BaseInstance.extend({
  props: {
    replicaset: 'string',
    state: 'string',
    aliases: {
      type: 'array',
      default: function() {
        return [];
      }
    }
  },
  serialize: function() {
    var res = this.getAttributes({
      props: true,
      derived: true
    }, true);
    if (this.databases.length > 0) {
      _.each(this._children, function(value, key) {
        res[key] = this[key].serialize();
      }, this);
      _.each(this._collections, function(value, key) {
        res[key] = this[key].serialize();
      }, this);
    }

    return res;
  }
});

module.exports = Instance;
module.exports.Collection = BaseInstance.Collection.extend({
  model: Instance
});
module.exports.connect = connect;
