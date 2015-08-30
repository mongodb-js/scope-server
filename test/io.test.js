/*eslint new-cap:0*/

var _ = require('lodash');
var EJSON = require('mongodb-extended-json');
var async = require('async');
var assert = require('assert');
var es = require('event-stream');

var helper = require('./helper');
var DELETE = helper.DELETE;
var POST = helper.POST;
var connect_to_socketio = helper.connect_to_socketio;
var create_socketio_readable = helper.create_socketio_readable;
var setup = helper.setup;
var teardown = helper.teardown;

describe.skip('io', function() {
  return describe('collection:sample', function() {
    var io;
    io = null;
    before(function(done) {
      return async.series({
        'Connect and get a token': setup,
        'Create the `haystack` collection': function(fn) {
          DELETE('/api/v1/localhost:27017/collections/test.haystack')
            .end(function() {
              POST('/api/v1/localhost:27017/collections/test.haystack').end(fn);
            });
        },
        'Put 1000 needles in it': function(fn) {
          var needles = [];
          _.each(_.range(0, 1000), function(i) {
            needles.push({
              _id: 'needle_' + i
            });
          });

          POST('/api/v1/localhost:27017/collections/test.haystack/bulk')
            .send(EJSON.stringify(needles))
            .end(function(err, res) {
              if (err) return fn(err);
              assert.equal(res.body.inserted_count, needles.length);
              fn();
            });
        },
        'Connect and authenticate with the socket.io endpoint': function(fn) {
          connect_to_socketio(function(err, client) {
            if (err) return fn(err);
            io = client;
            fn();
          });
        }
      }, done);
    });
    after(function(done) {
      return async.series({
        'Remove the `haystack` collection': function(fn) {
          DELETE('/api/v1/localhost:27017/collections/test.haystack').end(fn);
        },
        'Disconnect from socket.io': io.close
      }, teardown.bind(null, done));
    });
    it('should create a sample stream with 1 document', function(done) {
      var options = {
        size: 1
      };
      create_socketio_readable(io, 'collection:sample', options)
        .pipe(es.wait(function(err, docs) {
          assert.ifError(err);
          console.log('Got docs from sample stream', docs);
          return done();
        }));
    });
    it('should create a sample of 100 documents');
    it('should create a sample of 1000 documents');
    it('should not bork if the sample size is greater than the # of documents');
    it('should allow specifying a query');
    it('should allow specifying a field spec');
    return it('should default to a sort of `{$natural: -1}`');
  });
});
