{setup, teardown, GET, DELETE, POST} = require './helper'
EJSON = require 'mongodb-extended-json'
assert = require 'assert'
debug = require('debug') 'scout-server:test:collection'

describe 'Collection', ->
  before (done) ->
    setup (err) ->
      DELETE '/api/v1/localhost:27017/collections/test.scopes'
        .end  (err, res) -> done(null, res)

  after (done) ->
    DELETE '/api/v1/localhost:27017/documents/test.scopes/1'
      .expect 200
      .end (err, res) ->
        DELETE '/api/v1/localhost:27017/collections/test.scopes'
          .end  (err, res) ->
            return done(err) if err?
            teardown(done)

  it 'should not create collections automatically', (done) ->
    GET '/api/v1/localhost:27017/collections/test.scopes'
      .expect 404
      .end  (err, res) -> done err, res.body

  it 'should return collection details', (done) ->
    POST('/api/v1/localhost:27017/collections/test.scopes')
      .expect 201
      .end (err, res) ->
        return done(err) if err?

        GET '/api/v1/localhost:27017/collections/test.scopes'
          .expect 200
          .end (err, res) -> done err, res.body

  it 'should insert a new document', (done) ->
    POST '/api/v1/localhost:27017/documents/test.scopes'
      .send {_id: 1}
      .expect 201
      .end (err, res) ->
        debug 'insert document result', res.body
        return done(err) if err?

        done()

  it 'should be able to run find', (done) ->
    GET '/api/v1/localhost:27017/collections/test.scopes/find'
      .expect 200
      .end (err, res) ->
        return done err if err
        assert Array.isArray(res.body), 'Should return an array'
        assert.equal res.body.length, 1, 'Should return 1 document'
        done()

  it 'should be able to run count', (done) ->
    GET '/api/v1/localhost:27017/collections/test.scopes/count'
      .expect 200
      .end (err, res) ->
        return done err if err
        debug 'count returned', res.body
        assert.equal res.body.count, 1, 'Should return 1 document'
        done()

  it 'should be able to run find with explain', (done) ->
    GET '/api/v1/localhost:27017/collections/test.scopes/find'
      .query {explain: 1}
      .expect 200
      .end (err, res) ->
        return done err if err
        debug 'explain returned', res.body
        if res.body.cursor
          # Old explain
          assert.equal res.body.cursor, 'BasicCursor'
        else
          assert.equal res.body.queryPlanner.namespace, 'test.scopes'
        done()

  it 'should be able to run aggregate', (done) ->
    pipeline = EJSON.stringify [{$group: {_id: '$_id'}}]
    GET '/api/v1/localhost:27017/collections/test.scopes/aggregate'
      .query {pipeline: pipeline}
      .expect 200
      .end (err, res) ->
        return done err if err
        assert.equal res.body.length, 1
        done()
