{setup, teardown, GET, DELETE, POST} = require './helper'
EJSON = require 'mongodb-extended-json'
assert = require 'assert'
debug = require('debug') 'scout-server:test:collection'

describe 'Collection', ->
  before (done) ->
    setup (err) ->
      DELETE '/api/v1/localhost:27017/collections/test.pets'
        .end (err, res) -> done(null, res)

  after (done) ->
    DELETE '/api/v1/localhost:27017/documents/test.pets/1'
      .expect 200
      .end (err, res) ->
        DELETE '/api/v1/localhost:27017/collections/test.pets'
          .end () ->
            teardown(done)

  it 'should not create collections automatically', (done) ->
    GET '/api/v1/localhost:27017/collections/test.pets'
      .expect 404
      .end done

  it 'should create a new `pets` collection in the `test` database', (done) ->
    POST '/api/v1/localhost:27017/collections/test.pets'
      .expect 201
      .end done

  it 'should return collection details', (done) ->
    GET '/api/v1/localhost:27017/collections/test.pets'
      .expect 200
      .end (err, res) -> done err, res.body

  it 'should insert a new document', (done) ->
    POST '/api/v1/localhost:27017/documents/test.pets'
      .send
        _id: 1
        type: 'dog'
        name: 'Arlo'
      .expect 201
      .end done

  it 'should be able to run find', (done) ->
    GET '/api/v1/localhost:27017/collections/test.pets/find'
      .expect 200
      .end (err, res) ->
        assert.ifError err
        assert Array.isArray(res.body), 'Should return an array'
        assert.equal res.body.length, 1, 'Should return 1 document'

        assert.equal res.body[0]._id, 1
        assert.equal res.body[0].type, 'dog'
        assert.equal res.body[0].name, 'Arlo'
        done()

  it 'should be able to run count', (done) ->
    GET '/api/v1/localhost:27017/collections/test.pets/count'
      .expect 200
      .end (err, res) ->
        assert.ifError err
        assert.equal res.body.count, 1, 'Should return 1 document'
        done()

  it 'should be able to run find with explain', (done) ->
    GET '/api/v1/localhost:27017/collections/test.pets/find'
      .query {explain: 1}
      .expect 200
      .end (err, res) ->
        assert.ifError err

        if res.body.cursor
          assert.equal res.body.cursor, 'BasicCursor'
        else
          assert.equal res.body.queryPlanner.namespace, 'test.pets'
        done()

  it 'should be able to run an aggregation', (done) ->
    pipeline = EJSON.stringify [{$group: {_id: '$_id'}}]
    GET '/api/v1/localhost:27017/collections/test.pets/aggregate'
      .query {pipeline: pipeline}
      .expect 200
      .end (err, res) ->
        assert.ifError err
        assert.equal res.body.length, 1
        done()
