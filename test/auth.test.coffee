assert = require 'assert'
Deployment = require '../lib/models/deployment'

auth = process.env.MONGODB_AUTH or 'none'
port = parseInt(process.env.MONGODB_PORT or 27017, 10)

when_auth_is = (mode, fn) ->
  describe "When auth mode is #{mode}", () ->
    before () ->
      this.skip() if auth isnt mode
    fn()

describe 'Auth', ->
  when_auth_is 'basic', ->
    it 'should connect', (done) ->
      Deployment.create "root:password@localhost:27001", (err, d) ->
        assert.ifError err
        assert.equal d.instances.length, 1

        res = JSON.stringify(d)
        assert.equal res.indexOf('root'), -1,
          'Eep!  Should not contain username'
        assert.equal res.indexOf('password'), -1,
          'Epp!  Should not contain password'

        done()

  when_auth_is 'scram-sha-1', ->
    it 'should do connect'
