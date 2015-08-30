var _ = require('lodash');
var Instance = require('./instance');
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
  var conn = db.serverConfig;
  var state = conn.s.replset.s.replState;
  var replicasetName = state.setName;
  var instances = [];

  debug('running replSetGetStatus....');

  db.admin().replSetGetStatus(function(err, res) {
    if (err) return fn(err);

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

    instances.push({
      _id: Instance.getId(state.primary.name),
      name: state.primary.name,
      state: 'primary',
      replicaset: replicasetName
    });

    fn(null, {
      instances: instances,
      type: 'replicaset'
    });
  });
};
