Deployment = require '../lib/models/deployment'
{setup, teardown, GET, DELETE, POST} = require './helper'
EJSON = require 'mongodb-extended-json'
assert = require 'assert'
debug = require('debug') 'scout-server:test:deployment'

auth = process.env.MONGODB_AUTH or 'none'
topology = process.env.MONGODB_TOPOLOGY or 'standalone'
port = parseInt(process.env.MONGODB_PORT or 27017, 10)

when_topology_is = (mode, fn) ->
  describe "When the topology is #{mode}", () ->
    before () ->
      this.skip() if topology isnt mode
    fn()

describe 'Deployment', ->
  before setup
  after teardown

  it 'should show a list of deployments', (done) ->
    GET '/api/v1/deployments'
      .expect 200
      .end (err, res) ->
        assert.ifError err
        assert Array.isArray(res.body), 'Should return an array'
        assert.equal res.body.length, 1, 'Should return 1 document'
        done()

  it 'should return a single deployment', (done) ->
    GET "/api/v1/deployments/localhost:#{port}"
      .expect 200
      .end (err, res) ->
        done err

  when_topology_is 'standalone', ->
    standalone = null
    before (done) ->
      Deployment.create "localhost:#{port}", (err, d) ->
        done err, (standalone = d)

    it 'should discover the mongod on localhost by default', ->
      assert.equal standalone.instances.length, 1

    it 'should have a type of standalone', ->
      assert.equal standalone.type, 'standalone'

  when_topology_is 'replicaset', ->
    rs = null
    it 'should connect to an instance', (done) ->
      Deployment.create "localhost:#{port}", (err, d) ->
        return done(err) if err
        rs = d
        done()

    it 'should discover the primary', ->
      assert.equal (rs.instances.filter (i) -> i.state is 'primary').length, 1

    it 'should discover the two secondaries', ->
      assert.equal (rs.instances.filter (i) -> i.state is 'secondary').length, 2

    it 'should include the replicaset name in the instance metadata', ->
      matches = rs.instances.filter (i) -> i.rs is 'replicom'
      assert.equal matches.length, 3

    it 'should squish if we create a new deployment with a secondary', (done) ->
      Deployment.create "localhost:#{port+1}", (err, d) ->
        return done(err) if err
        assert d

        Deployment.get "localhost:#{port}", (err, d) ->
          assert d == undefined
          done()

  when_topology_is 'cluster', ->
    describe 'When connecting to a router', ->
      before () -> this.skip() if topology isnt 'cluster'
      cluster = null
      router_id = "localhost:#{port}"

      it 'should connect to the router', (done) ->
        Deployment.create router_id, (err, d) ->
          return done(err) if err
          cluster = d
          done()

      it 'should discover all instances in the cluster', ->
        assert.equal cluster.instances.length, 6

      it 'should disambiguate localhost', ->
        assert.equal cluster._id, router_id

    describe 'When connecting to a shard', ->
      replicaset = null
      cluster = null
      before () -> this.skip() if topology isnt 'cluster'

      it 'should connect to the shard', (done) ->
        Deployment.create 'localhost:31000', (err, deployment) ->
          return done(err) if(err)
          replicaset = deployment
          done()

      it 'should create a deployment just for the shard', ->
        assert.equal replicaset.instances.length, 1

      it 'should not include any routers as the shard has no way of
          knowing it is part of a cluster on it\'s own', ->
        assert.equal replicaset.sharding, undefined

      it 'should discover all replicaset members', ->
        assert.equal replicaset.instances.length, 1

      describe 'If you then connect to a router', ->
        before (done) ->
          Deployment.create "localhost:#{port}", (err, deployment) ->
            return done(err) if(err)
            cluster = deployment
            done()

        it 'should have removed the old deployment', (done)->
          Deployment.get 'localhost:31200', (err, deployment) ->
            return done(err) if err
            assert.equal deployment, undefined
            done()
