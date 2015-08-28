{setup, teardown, GET, DELETE, POST, PUT} = require './helper'
EJSON = require 'mongodb-extended-json'
assert = require 'assert'
debug = require('debug') 'mongoscope:test:indexes'

describe.skip 'Indexes', ->
  before (done)->
    setup () ->
      POST '/api/v1/localhost:27017/collections/test.pets'
        .end () ->
          done()

  after teardown

  it 'should list only the default _id_ index', (done) ->
    GET '/api/v1/localhost:27017/indexes/test.pets'
      .expect 200
      .end (err, res) ->
        asser.ifError err
        assert res.body.length is 1
        assert.equal res.body[0].name, '_id_'
        done()

  it 'should not barf if no json sent', (done) ->
    GET '/api/v1/localhost:27017/indexes/test.pets'
      .end done

  it 'should reject bad options', (done) ->
    params = {field: {_id: 1}, options: 'what are these?'}
    PUT '/api/v1/localhost:27017/indexes/test.pets'
      .send EJSON.stringify(params)
      .expect 400
      .end done

  it 'should create an index', (done) ->
    POST '/api/v1/localhost:27017/indexes/test.pets'
      .send JSON.stringify({field: 'testing'})
      .expect 201
      .end (err, res) ->
        asser.ifError err
        assert res.body.name == 'testing_1'
        done()

  it 'should create a compound index', (done) ->
    payload = {field: {_id: 1, testing: 1}, options: {name: 'testing_and_id'}}
    POST '/api/v1/localhost:27017/indexes/test.pets'
      .send JSON.stringify(payload)
      .expect 201
      .end (err, res) ->
        assert.ifError err
        assert res.body.name == 'testing_and_id'
        done()

  it 'should return a single index', (done) ->
    GET '/api/v1/localhost:27017/indexes/test.pets/_id_'
      .expect 200
      .end (err, res) ->
        assert.ifError err
        assert res.body.name == '_id_'
        done()

  it 'should update an index', (done) ->
    payload = {field: {'testing_1': 1}, options: {name: 'testing'}}
    PUT '/api/v1/localhost:27017/indexes/test.pets'
      .send JSON.stringify(payload)
      .expect 200
      .end (err, res) ->
        assert.ifError err
        assert res.body.name == 'testing'
        done()

  it 'should destroy an index', (done) ->
    DELETE '/api/v1/localhost:27017/indexes/test.pets/testing'
      .expect 204
      .end done
