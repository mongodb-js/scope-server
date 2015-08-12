{setup, teardown, GET, POST} = require './helper'
assert = require 'assert'
EJSON = require 'mongodb-extended-json'
debug = require('debug') 'scout-server:test:instance'

describe 'Instance', ->
  before setup
  after teardown

  it.skip 'should get instance details', (done) ->
    GET '/api/v1/localhost:27017'
      .expect 200
      .end (err, res) ->
        res.body = EJSON.deflate res.body

        console.log 'instance details', res.body
        return done(err) if err
        done()
