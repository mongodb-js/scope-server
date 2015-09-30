/* eslint new-cap:0 */
var helper = require('./helper');
var assert = require('assert');
var GET = helper.GET;
var setup = helper.setup;
var teardown = helper.teardown;

var Deployment = require('../lib/models/deployment');
var topology = process.env.MONGODB_TOPOLOGY || 'standalone';

var when_topology_is = function(mode, fn) {
  return describe('When the topology is ' + mode, function() {
    before(function() {
      if (topology !== mode) {
        return this.skip();
      }
    });
    return fn();
  });
};

describe('Deployment', function() {
  before(setup);
  after(teardown);
  it('should show a list of deployments', function(done) {
    GET('/api/v1/deployments')
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert(Array.isArray(res.body), 'Should return an array');
        assert.equal(res.body.length, 1, 'Should return 1 document');
        done();
      });
  });
  it('should return a single deployment', function(done) {
    GET('/api/v1/deployments/localhost:27017')
      .expect(200)
      .end(done);
  });
  when_topology_is('standalone', function() {
    var standalone = null;
    before(function(done) {
      Deployment.create('localhost:27017', function(err, d) {
        standalone = d;
        done(err);
      });
    });
    it('should discover the mongod on localhost by default', function() {
      return assert.equal(standalone.instances.length, 1);
    });
    it('should have a type of standalone', function() {
      return assert.equal(standalone.type, 'standalone');
    });
  });
  when_topology_is('replicaset', function() {
    var rs = null;
    it('should connect to an instance', function(done) {
      Deployment.create('localhost:27017', function(err, d) {
        if (err) {
          return done(err);
        }
        rs = d;
        done();
      });
    });
    it('should discover the primary', function() {
      assert.equal((rs.instances.filter(function(i) {
        return i.state === 'primary';
      })).length, 1);
    });
    it('should discover the two secondaries', function() {
      assert.equal((rs.instances.filter(function(i) {
        return i.state === 'secondary';
      })).length, 2);
    });
    it('should include the replicaset name in the instance metadata', function() {
      var matches = rs.instances.filter(function(i) {
        return i.replicaset === 'replicaset';
      });
      assert.equal(matches.length, 3);
    });
  });
  when_topology_is('cluster', function() {
    describe('When connecting to a router', function() {
      var cluster;
      var router_id;
      before(function() {
        if (topology !== 'cluster') {
          return this.skip();
        }
      });
      cluster = null;
      router_id = 'localhost:27017';
      it('should connect to the router', function(done) {
        Deployment.create(router_id, function(err, d) {
          if (err) {
            return done(err);
          }
          cluster = d;
          done();
        });
      });
      it('should discover all instances in the cluster', function() {
        assert.equal(cluster.instances.length, 6);
      });
      it('should disambiguate localhost', function() {
        assert.equal(cluster._id, router_id);
      });
    });

    describe('When connecting to a shard', function() {
      var replicaset = null;
      before(function() {
        if (topology !== 'cluster') {
          return this.skip();
        }
      });
      it('should connect to the shard', function(done) {
        Deployment.create('localhost:31000', function(err, deployment) {
          if (err) {
            return done(err);
          }
          replicaset = deployment;
          done();
        });
      });
      it('should create a deployment just for the shard', function() {
        assert.equal(replicaset.instances.length, 1);
      });
      it('should not include any routers as the shard has no way of knowing '
        + 'it is part of a cluster on it\'s own', function() {
          assert.equal(replicaset.sharding, undefined);
        });
      it('should discover all replicaset members', function() {
        assert.equal(replicaset.instances.length, 1);
      });
      describe('If you then connect to a router', function() {
        before(function(done) {
          Deployment.create('localhost:27017', done);
        });
        it('should have removed the old deployment', function(done) {
          Deployment.get('localhost:31200', function(err, deployment) {
            if (err) {
              return done(err);
            }
            assert.equal(deployment, undefined);
            done();
          });
        });
      });
    });
  });
});
