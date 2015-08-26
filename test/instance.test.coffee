{setup, teardown, GET, POST} = require './helper'
assert = require 'assert'
EJSON = require 'mongodb-extended-json'
debug = require('debug') 'scout-server:test:instance'

describe 'Instance', ->
  before setup
  after teardown

  it 'should get instance details', (done) ->
    GET '/api/v1/localhost:27017'
      .expect 200
      .end (err, res) ->
        res.body = EJSON.deflate res.body

        assert.ifError err
        assert.equal res.body._id, 'localhost:27017'
        done()
