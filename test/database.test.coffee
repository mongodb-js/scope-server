{setup, teardown, GET, POST} = require './helper'
debug = require('debug') 'scout-server:test:database'

describe 'Database', () ->
  before setup
  after teardown

  it.skip 'should create a new database', (done) ->
    POST '/api/v1/localhost:27017/databases/test'
      .expect 201
      .end done

  it 'should return database details', (done) ->
    GET '/api/v1/localhost:27017/databases/test'
      .expect 200
      .end done
