helpers = require './helpers'
ctx = helpers.ctx
assert = require 'assert'
debug = require('debug') 'mongoscope:test:indexes'

describe.skip 'Indexes', ->
  before (done)->
    before helpers.before (err) ->
      return done err if err?
      helpers.createCollection 'scopes', done

  after helpers.after

  uri = '/api/v1/localhost:27017/indexes/test.scopes'

  it 'should list only the default _id_ index', (done) ->
    helpers.get uri
      .set 'Authorization', "Bearer #{ctx.token}"
      .end (err, res) ->
        assert.equal 200, res.status, "Bad response: #{res.text}"
        return done err if err
        assert res.body.length is 1
        assert.equal res.body[0].name, '_id_'
        done()

  it 'should not barf if no json sent', (done) ->
    helpers.put uri
      .set 'Authorization', "Bearer #{ctx.token}"
      .end (err, res) ->
        assert.equal 400, res.status, "Bad response: #{res.text}"
        return done err if err
        done()

  it 'should reject bad options', (done) ->
    helpers.put uri
      .set 'Authorization', "Bearer #{ctx.token}"
      .type 'json'
      .send JSON.stringify({field: {_id: 1}, options: 'what are these?'})
      .end (err, res) ->
        assert.equal 400, res.status, "Bad response: #{res.text}"
        return done err if err
        done()

  it 'should create an index', (done) ->
    helpers.post uri
      .set 'Authorization', "Bearer #{ctx.token}"
      .type 'json'
      .send JSON.stringify({field: 'testing'})
      .end (err, res) ->
        assert.equal 201, res.status, "Bad response: #{res.text}"
        return done err if err
        assert res.body.name == 'testing_1'
        done()

  it 'should create a compound index', (done) ->
    helpers.post uri
      .set 'Authorization', "Bearer #{ctx.token}"
      .type 'json'
      .send JSON.stringify({field: {_id: 1, testing: 1}, options: {name: 'testing_and_id'}})
      .end (err, res) ->
        assert.equal 201, res.status, "Bad response: #{res.text}"
        return done err if err
        assert res.body.name == 'testing_and_id'
        done()

  it 'should return a single index', (done) ->
    helpers.get "#{uri}/_id_"
      .set 'Authorization', "Bearer #{ctx.token}"
      .end (err, res) ->
        assert.equal 200, res.status, "Bad response: #{res.text}"
        return done err if err
        assert res.body.name == '_id_'
        done()

  it 'should update an index', (done) ->
    assert ctx.token
    helpers.put uri
      .set 'Authorization', "Bearer #{ctx.token}"
      .type 'json'
      .send JSON.stringify({field: {'testing_1': 1}, options: {name: 'testing'}})
      .end (err, res) ->
        assert.equal 200, res.status, "Bad response: #{res.text}"
        return done err if err
        assert res.body.name == 'testing'
        done()

  it 'should destroy an index', (done) ->
    assert ctx.token
    helpers.del "#{uri}/testing"
      .set 'Authorization', "Bearer #{ctx.token}"
      .end (err, res) ->
        assert.equal 204, res.status, "Bad response: #{res.text}"
        return done err if err
        done()
