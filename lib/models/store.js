var _ = require('lodash');
var sift = require('sift');
var debug = require('debug')('mongodb-scope-server:models:store');

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

    if (_.keys(query).length === 0) {
      return store.all(fn);
    }
    var d = sift(query, _.values(store_data).map(function(model) {
      return model.serialize();
    }));

    debug('Found %d results for `%j`', d.length, query);
    fn(null, _.chain(d).map(function(s) {
      return store_data[s._id];
    }).value());
  },
  findOne: function(query, fn) {
    store.find(query, function(err, docs) {
      if (err) {
        return fn(err);
      }
      if (!docs) {
        debug('uhoh... findOne didnt return anything...');
        fn();
      } else {
        fn(null, docs[0]);
      }
    });
  },
  clear: function(fn) {
    debug('clearing');
    store.find({}, function(err, docs) {
      debug('store.find returned', err, docs);
      if (err) {
        return fn(err);
      }
      if (docs.length === 0) {
        return fn();
      }

      var pending = docs.length;
      docs.map(function(doc) {
        store.remove(doc._id, function() {
          pending--;
          if (pending === 0) {
            return fn();
          }
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
    debug('all');
    fn(null, _.values(store_data));
  }
};
