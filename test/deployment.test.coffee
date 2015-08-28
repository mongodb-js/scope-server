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
    GET '/api/v1/deployments/localhost:27017'
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
      Deployment.create 6000, (err, d) ->
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
      Deployment.create 6001, (err, d) ->
        return done(err) if err
        assert d

        Deployment.get 6000, (err, d) ->
          assert d == undefined
          done()

  when_topology_is 'cluster', ->
    describe 'When connecting to a router', ->
      before () ->
        this.skip() if topology isnt 'cluster'
      cluster = null
      router_id = "localhost:30999"

      it 'should connect to the router', (done) ->
        Deployment.create "localhost:#{port}", (err, d) ->
          return done(err) if err
          cluster = d
          done()

      it 'should correctly identify the router', ->
        instance = cluster.getInstance router_id
        assert.equal instance.type, 'router'

      it 'should discover all instances in the cluster', ->
        assert.equal cluster.instances.length, 8


      it 'should disambiguate localhost', ->
        assert.equal cluster.seed, router_id

      it 'should name the cluster using the seed', ->
        assert.equal cluster.name.indexOf("cluster on"), 0

    describe.skip 'When connecting to a shard', ->
      replicaset = null
      cluster = null
      before () ->
        this.skip() if topology isnt 'cluster'
      it 'should connect to the shard', (done) ->
        Deployment.create 'localhost:31200', (err, deployment) ->
          return done(err) if(err)
          replicaset = deployment
          done()

      it 'should create a deployment just for the shard', ->
        assert.equal replicaset.instances.length, 3

      it 'should not include any routers as the shard has no way of
          knowing it is part of a cluster on it\'s own', ->
        assert.equal replicaset.sharding, undefined

      it "should take the hint that replicaset names which end in a
        number are likely shards in a grander scheme", ->
        assert.equal replicaset.maybe_sharded, true

      it 'should discover all replicaset members', ->
        assert.equal replicaset.instances.length, 3

      describe 'If you then connect to a router', ->
        before (done) ->
          Deployment.create 'mongodb://localhost:30999', (err, deployment) ->
            return done(err) if(err)
            cluster = deployment
            done()

        it 'should have removed the old deployment', (done)->
          Deployment.get "localhost:31200", (err, deployment) ->
            return done(err) if err
            debug 'deployment.get returned', deployment
            assert.equal deployment._id, "localhost:30999"
            done()
