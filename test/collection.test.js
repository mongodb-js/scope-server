/*eslint new-cap:0*/
var helper = require('./helper');
var EJSON = require('mongodb-extended-json');
var assert = require('assert');
var DELETE = helper.DELETE;
var GET = helper.GET;
var POST = helper.POST;
var setup = helper.setup;
var teardown = helper.teardown;

describe('Collection', function() {
  before(function(done) {
    setup(function() {
      DELETE('/api/v1/localhost:27017/collections/test.pets')
        .end(function() {
          done();
        });
    });
  });
  after(function(done) {
    DELETE('/api/v1/localhost:27017/documents/test.pets/1')
      .end(function() {
        DELETE('/api/v1/localhost:27017/collections/test.pets')
          .end(function() {
            teardown(done);
          });
      });
  });
  it('should not create collections automatically', function(done) {
    GET('/api/v1/localhost:27017/collections/test.pets')
      .expect(404)
      .end(done);
  });
  it('should create a new `pets` collection in the `test` database', function(done) {
    POST('/api/v1/localhost:27017/collections/test.pets')
      .expect(201)
      .end(done);
  });
  it('should return collection details', function(done) {
    GET('/api/v1/localhost:27017/collections/test.pets')
      .expect(200)
      .end(done);
  });
  it('should insert a new document', function(done) {
    var document = {
      _id: 1,
      type: 'dog',
      name: 'Arlo'
    };
    POST('/api/v1/localhost:27017/documents/test.pets')
      .send(document)
      .expect(201)
      .end(done);
  });
  it('should be able to run find', function(done) {
    GET('/api/v1/localhost:27017/collections/test.pets/find')
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert(Array.isArray(res.body), 'Should return an array');
        assert.equal(res.body.length, 1, 'Should return 1 document');
        assert.equal(res.body[0]._id, 1);
        assert.equal(res.body[0].type, 'dog');
        assert.equal(res.body[0].name, 'Arlo');
        done();
      });
  });
  it('should be able to run count', function(done) {
    GET('/api/v1/localhost:27017/collections/test.pets/count')
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.count, 1, 'Should return 1 document');
        done();
      });
  });
  it('should be able to run find with explain', function(done) {
    GET('/api/v1/localhost:27017/collections/test.pets/find')
      .query({
        explain: 1
      })
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        if (res.body.cursor) {
          assert.equal(res.body.cursor, 'BasicCursor');
        } else {
          assert.equal(res.body.queryPlanner.namespace, 'test.pets');
        }
        done();
      });
  });
  it('should be able to run an aggregation', function(done) {
    var pipeline = EJSON.stringify([
      {
        $group: {
          _id: '$_id'
        }
      }
    ]);
    GET('/api/v1/localhost:27017/collections/test.pets/aggregate').query({
      pipeline: pipeline
    }).expect(200).end(function(err, res) {
      assert.ifError(err);
      assert.equal(res.body.length, 1);
      done();
    });
  });
});
