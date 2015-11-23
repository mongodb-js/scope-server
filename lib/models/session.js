/**
 * A `Session` is the container that which actually stores
 * and manages driver connection instances.
 *
 * @todo (imlucas): :axe: to `mongodb-session-model`.
 */
var config = require('mongoscope-config');
var uuid = require('uuid');
var async = require('async');
var Instance = require('./instance');
var debug = require('debug')('mongodb-scope-server:models:session');

function generateId(fn) {
  process.nextTick(function() {
    fn(null, uuid.v4());
  });
}

var _reapers = {};
/**
 * @todo (imlucas): All accesses on this should be abstracted
 * into `session-store.js` that will be more explicit and
 * documented as it is our last line of seperation btwn `mongodb-scope-server`
 * and the driver.  That is, if we need to throw buckets of sand
 * on a vuln or compat fire, there is 1 place for it.
 */
var _connections = {};

function destroyReaper(sessionId) {
  if (!_reapers[sessionId]) {
    return debug('No reaper for `%s`', sessionId);
  }

  if (_reapers[sessionId]) {
    clearTimeout(_reapers[sessionId]);
    _reapers[sessionId] = undefined;
    debug('destroyed reaper for `%s`', sessionId);
  }
}

function destroySession(sessionId, fn) {
  debug('destroying `%s`', sessionId);
  if (_connections[sessionId]) {
    _connections[sessionId].close();
    _connections[sessionId] = undefined;
    debug('reaped connection for `%s`', sessionId);
  }
  destroyReaper(sessionId);
  if (fn) {
    return fn();
  }
}

function createReaper(sessionId) {
  debug('creating reaper for `%s`', sessionId);
  /**
   * Reap the session 5 seconds after it is set to
   * expire so the connection to MongoDB will be closed,
   * whether the client is following the rules or not.
   */
  var timeout = config.get('token:lifetime') * 60 * 1000 + 5000;
  var reap = function() {
    /* eslint no-console:0 */
    console.trace('Reaping expired session! ' + sessionId);
    destroySession(sessionId);
  };

  _reapers[sessionId] = setTimeout(reap, timeout);
  debug('created reaper for `%s`.  session will be reaped in %sms', sessionId, timeout);
}

module.exports.create = function(model, fn) {
  debug('creating `%j`', model);
  var tasks = {
    connection: Instance.connect.bind(null, model),
    sessionId: generateId
  };

  async.series(tasks, function(err, res) {
    if (err) {
      return fn(err);
    }

    _connections[res.sessionId] = res.connection;
    createReaper(res.sessionId);

    var session = {
      _id: res.sessionId,
      connection: res.connection
    };
    debug('created! `%s`', session._id);
    fn(null, session);
  });
};

module.exports.destroy = destroySession;

module.exports.get = function(sessionId, fn) {
  debug('get `%j`', sessionId);
  process.nextTick(function() {
    fn(null, _connections[sessionId]);
  });
};

module.exports.exists = function(sessionId, fn) {
  process.nextTick(function() {
    var exists = _connections[sessionId] !== undefined;
    debug('does `%s` already exist?', sessionId, exists);
    fn(null, exists);
  });
};
