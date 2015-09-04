var config = require('mongoscope-config');
var uuid = require('uuid');
var async = require('async');
var Instance = require('./instance');
var debug = require('debug')('scout-server:models:session');

function generateId(fn) {
  process.nextTick(function() {
    fn(null, uuid.v4());
  });
}

var _reapers = {};
var _connections = {};

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

function createReaper(sessionId) {
  debug('creating reaper for `%s`', sessionId);
  var timeout = config.get('token:lifetime') * 60 * 1000 + 1000;
  var reap = destroySession.bind(null, sessionId);

  _reapers[sessionId] = setTimeout(reap, timeout);
  debug('created reaper for `%s`', sessionId);
}

module.exports.create = function(url, opts, fn) {
  debug('creating `%s`', url);
  var tasks = {
    connection: Instance.connect.bind(null, url, opts),
    sessionId: generateId
  };

  async.series(tasks, function(err, res) {
    if (err) {
      return fn(err);
    }

    // @todo: need a session or token model...
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
  debug('get `%s`', sessionId);
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
