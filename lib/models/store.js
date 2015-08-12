var _ = require('lodash');
var debug = require('debug')('scout-server:models:store');

// @todo: use an underscorejs collection for the query guts as it already has
// all of the filtering/grouping/etc.

var store_data = {};
var store_keys = [];

var store = module.exports = {
  keys: function(fn) {
    fn(null, store_keys);
  },
  key: function(fn) {
    fn(null, store_keys.length);
  },
  get: function(key, fn) {
    if (!key) {
      return fn(new Error('Invalid key `' + key + '`'));
    }
    var res = store_data[key];
    debug('get `%s`', key);
    fn(null, res);
  },
  remove: function(key, fn) {
    debug('remove `%s`', key);
    delete store_data[key];
    store_keys.splice(store_keys.indexOf(key), 1);
    return fn();
  },
  find: function(query, fn) {
    if (typeof query === 'function') {
      fn = query;
      query = {};
    }

    debug('find `%j`', query);
    if (_.keys(query).length === 0) {
      return fn(null, _.values(store_data));
    }
    fn(null, _.findWhere(_.values(store_data), query));
  },
  findOne: function(query, fn) {
    store.find(query, function(err, docs) {
      if (err) return fn(err);
      fn(null, docs[0]);
    });
  },
  clear: function(fn) {
    debug('clearing');
    store.find({}, function(err, docs) {
      debug('store.find returned', err, docs);
      if (err) return fn(err);
      if (docs.length === 0) return fn();

      var pending = docs.length;
      docs.map(function(doc) {
        store.remove(doc._id, function() {
          pending--;
          if (pending === 0) return fn();
        });
      });
    });
  },
  set: function(key, val, fn) {
    debug('set `%s` -> `%j`', key, val);
    store_data[key] = val;
    if (store_keys.indexOf(key) === -1) {
      store_keys.push(key);
    }
    fn();
  },
  all: function(fn) {
    fn(null, _.values(store_data));
  }
};
