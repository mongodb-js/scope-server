{setup, teardown, GET, DELETE, POST, token} = require './helper'
{connect_to_socketio, create_socketio_readable} = require './helper-socketio'

EJSON = require 'mongodb-extended-json'
async = require 'async'
assert = require 'assert'

describe 'io', ->
  describe 'collection:sample', () ->
    io = null

    before (done) ->
      async.series({
        'Connect and get a token': setup
        'Create the haystack collection': (fn) ->
          # DELETE '/api/v1/localhost:27017/collections/test.haystack'
          #   .end () ->
          POST '/api/v1/localhost:27017/collections/test.haystack'
            .expect 201
            .end fn
        'Put 1000 needles in it': (fn) ->
          needles = ({_id: "needle_#{i}"} for i in [1..1000])
          POST '/api/v1/localhost:27017/collections/test.haystack/bulk'
            .send EJSON.stringify(needles)
            .end (err, res) ->
              return fn(err) if err
              assert.equal res.body.inserted_count, needles.length
              fn()
        'Connect and authenticate with the socket.io endpoint': (fn) ->
          io = connect_to_socketio fn
      }, done)

    after (done) ->
      async.series({
        'Remove the haystack': (fn) ->
          DELETE '/api/v1/localhost:27017/collections/test.haystack'
            .end fn
        'Disconnect from socket.io': io.close
      }, teardown.bind(null, done))

    it 'should create a sample stream with 1 document', (done) ->
      create_socketio_readable(io, 'collection:sample', {size: 1})
        .on 'error', done
        .pipe es.wait((err, docs) ->
          assert.ifError err
          console.log 'Got docs from sample stream', docs
          done()
        )
