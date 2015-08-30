/*eslint new-cap:0*/
var EJSON = require('mongodb-extended-json');
var assert = require('assert');

var helper = require('./helper');
var DELETE = helper.DELETE;
var GET = helper.GET;
var POST = helper.POST;
var PUT = helper.PUT;
var setup = helper.setup;
var teardown = helper.teardown;

describe.skip('Indexes', function() {
  before(function(done) {
    setup(function() {
      POST('/api/v1/localhost:27017/collections/test.pets').end(function() {
        done();
      });
    });
  });
  after(teardown);
  it('should list only the default _id_ index', function(done) {
    GET('/api/v1/localhost:27017/indexes/test.pets')
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.length, 1);
        assert.equal(res.body[0].name, '_id_');
        done();
      });
  });
  it('should not barf if no json sent', function(done) {
    GET('/api/v1/localhost:27017/indexes/test.pets').end(done);
  });
  it('should reject bad options', function(done) {
    var body = {
      field: {
        _id: 1
      },
      options: 'what are these?'
    };
    PUT('/api/v1/localhost:27017/indexes/test.pets')
      .send(EJSON.stringify(body))
      .expect(400)
      .end(done);
  });
  it('should create an index', function(done) {
    var body = {
      field: 'testing'
    };
    POST('/api/v1/localhost:27017/indexes/test.pets')
      .send(JSON.stringify(body))
      .expect(201)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.name, 'testing_1');
        done();
      });
  });
  it('should create a compound index', function(done) {
    var body = {
      field: {
        _id: 1,
        testing: 1
      },
      options: {
        name: 'testing_and_id'
      }
    };
    POST('/api/v1/localhost:27017/indexes/test.pets')
      .send(JSON.stringify(body))
      .expect(201)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.name, 'testing_and_id');
        done();
      });
  });
  it('should return a single index', function(done) {
    GET('/api/v1/localhost:27017/indexes/test.pets/_id_')
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.name, '_id_');
        done();
      });
  });
  it('should update an index', function(done) {
    var body = {
      field: {
        testing_1: 1
      },
      options: {
        name: 'testing'
      }
    };
    PUT('/api/v1/localhost:27017/indexes/test.pets')
      .send(JSON.stringify(body))
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.name, 'testing');
        done();
      });
  });
  it('should destroy an index', function(done) {
    DELETE('/api/v1/localhost:27017/indexes/test.pets/testing').expect(204).end(done);
  });
});

// ---
// generated by coffee-script 1.9.2
