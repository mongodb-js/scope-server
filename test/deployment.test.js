/* eslint new-cap:0, no-shadow:0, camelcase:0 */
var helper = require('./helper');
var assert = require('assert');
var GET = helper.GET;
var setup = helper.setup;
var teardown = helper.teardown;
var when_topology_is = helper.when_topology_is;
var Deployment = require('../lib/models/deployment');

describe('Deployment', function() {
  before(setup);
  after(teardown);
  it('should show a list of deployments', function(done) {
    GET('/api/v1/deployments')
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }
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
      assert.equal(standalone.instances.length, 1);
    });
    it('should have a type of standalone', function() {
      assert.equal(standalone.type, 'standalone');
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
        try {
          assert.equal(rs.type, 'replicaset');
        } catch (err) {
          return done(err);
        }
        done();
      });
    });
    it('should discover the primary', function() {
      assert.equal(rs.type, 'replicaset');
      assert.equal((rs.instances.filter(function(i) {
        return i.state === 'primary';
      })).length, 1);
    });
    it('should discover the two secondaries', function() {
      assert.equal(rs.type, 'replicaset');
      assert.equal((rs.instances.filter(function(i) {
        return i.state === 'secondary';
      })).length, 2);
    });
    it('should include the replicaset name in the instance metadata', function() {
      assert.equal(rs.type, 'replicaset');
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
        if (helper.topology !== 'cluster') {
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
        if (helper.topology !== 'cluster') {
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
      it('should not include any routers', function() {
        /**
         * @todo (imlucas): Cleanup
         * bc the shard has no way of knowing
         * it is part of a cluster on it's own
         */
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
  describe('Regressions', function() {
    /**
     * @see https://jira.mongodb.org/browse/INT-730
     */
    describe('INT-730: Errant `.` in deployment discovery', function() {
      it('should cannonicalize correctly', function(done) {
        var opts = {
          _id: 'amit-ubuntu1404-2015-09:27017',
          instances: [
            {
              _id: 'amit-ubuntu1404-2015-09:27017'
            }
          ]
        };
        /**
         * Error reports showed us that in `compass@0.4.3`
         * the above would be errantly cannonicalized
         * as `amit-ubuntu1404-2015-09.:27017`.
         */
        var d = new Deployment();
        d.cannonicalize(opts, function(err) {
          if (err) {
            return done(err);
          }

          assert.equal(d.instances.length, 1);
          assert.equal(d.instances.at(0).getId(), 'amit-ubuntu1404-2015-09:27017');
          done();
        });
      });
    });
  });
});
