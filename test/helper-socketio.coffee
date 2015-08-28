socketio = require 'socket.io-client'
EJSON = require 'mongodb-extended-json'
ss = require 'socket.io-stream'
es = require 'event-stream'
http = require 'http'
supertest = require 'supertest'
debug = require('debug') 'scout-server:test:helper-socketio'

{token} = require './helper'

app = require '../'

module.exports.connect_to_socketio = (done) ->
  server = http.createServer(app)
  server.listen 0, () ->
    console.log('Server listening...', server.address())

    debug 'connecting to socket.io...'
    io = socketio.connect "http://127.0.0.0:#{server.address().port}", {
      timeout: 100,
      transports: ['websocket'],
      'force new connection': true
    }

    io.on 'connect', () ->
      debug 'connected to socket.io'
      debug 'authenticating socket.io transport...'
      io.emit 'authenticate', {token: token()}

    io.on 'authenticated', done.bind(null, null, io)
    io.on 'error', done


parse_ejson = es.map (buf, done) ->
  # No results :(
  return done() if buffer.length is 0

  # `\n]\n`: End of the array has no documents so we can just drop it.
  return done() if buffer[0:2] is [10, 93, 10]

  # `[\n`: Begining of the array and the first document.
  # `\n,\n`: A document that's not first.
  buffer = buffer.slice(if buffer[0:1] is [91, 10] then 2 else 3)

  # Parse it as MongoDB Extended JSON
  done null, JSON.parse(buffer, EJSON.reviver)

create_socketio_readable = (io, channel, params) ->
  stream = ss.createStream io
  ss(io).emit channel, stream, params
  stream.pipe parse_ejson
