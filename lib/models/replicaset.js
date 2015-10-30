/**
 * @todo (imlucas): :axe: to `mongodb-replicaset`.
 */
var _ = require('lodash');
var Instance = require('./instance');
var sharding = require('./sharding');
var errors = require('mongodb-js-errors');
var isNotReplicaset = errors.isNotReplicaset;
var isNotAuthorized = errors.isNotAuthorized;
var isRouter = errors.isRouter;
var debug = require('debug')('scout-server:models:replicaset');

var MEMBER_STATE = {
  STARTUP: 0,
  PRIMARY: 1,
  SECONDARY: 2,
  RECOVERING: 3,
  FATAL: 4,
  STARTUP2: 5,
  UNKNOWN: 6, // remote node not yet reached
  ARBITER: 7,
  DOWN: 8, // node not reachable for a report
  ROLLBACK: 9,
  SHUNNED: 10 // node shunned from replica set
};

module.exports.discover = function(db, fn) {
  var instances = [];

  debug('running replSetGetStatus....');
  db.admin().replSetGetStatus(function(err, res) {
    if (err) {
      if (isRouter(err)) {
        debug('its a cluster');
        sharding.discover(db, fn);
        return;
      }
      if (isNotReplicaset(err)) {
        debug('not using replication');
        process.nextTick(function() {
          var p = db.serverConfig.s;
          fn(null, {
            instances: [{
              _id: p.host + ':' + p.port
            }]
          });
        });
        return;
      }

      if (isNotAuthorized(err)) {
        debug('not authorized to check replication.  falling back to standalone');
        process.nextTick(function() {
          var p = db.serverConfig.s;
          fn(null, {
            instances: [{
              _id: p.host + ':' + p.port
            }]
          });
        });
        return;
      }

      err.command = 'replSetGetStatus';
      fn(err);
      return;
    }

    var replicasetName = res.set;
    debug('replset status', res);

    var secondaries = _.chain(res.members)
      .filter(function(member) {
        return member.state === MEMBER_STATE.SECONDARY;
      })
      .map(function(member) {
        return {
          _id: Instance.getId(member.name),
          name: member.name,
          state: 'secondary',
          replicaset: replicasetName
        };
      })
      .value();

    if (secondaries.length === 0) {
      debug('No secondaries');
    } else {
      debug('%d secondaries', secondaries.length);
      instances.push.apply(instances, secondaries);
    }

    var arbiters = _.chain(res.members)
      .filter(function(member) {
        return member.state === MEMBER_STATE.ARBITER;
      })
      .map(function(member) {
        return {
          _id: Instance.getId(member.name),
          name: member.name,
          state: 'arbiter',
          replicaset: replicasetName
        };
      })
      .value();

    if (arbiters.length === 0) {
      debug('No arbiters');
    } else {
      debug('%d arbiters', arbiters.length);
      instances.push.apply(instances, arbiters);
    }

    var primary = _.findWhere(res.members, {
      state: MEMBER_STATE.PRIMARY
    });

    if (primary) {
      instances.push({
        _id: Instance.getId(primary.name),
        name: primary.name,
        state: 'primary',
        replicaset: replicasetName
      });
    } else {
      debug('No primary');
    }

    fn(null, {
      instances: instances,
      type: 'replicaset'
    });
  });
};
