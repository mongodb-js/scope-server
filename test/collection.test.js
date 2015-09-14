/*eslint new-cap:0*/
var helper = require('./helper');
var EJSON = require('mongodb-extended-json');
var assert = require('assert');
var DELETE = helper.DELETE;
var GET = helper.GET;
var POST = helper.POST;
var setup = helper.setup;
var teardown = helper.teardown;
var _ = require('lodash');
var mongodb = require('mongodb');
var async = require('async');

/**
 * These tests test the routes for commands performed against a collection.
 * They set up various collections in different configurations and then
 * run commands on them, looking for specific results.
 * The tests are split up based on which route they test.
 * Setup and takedown is done by connection directly to the database through
 * The driver and not by using the routes themselves.
 */
describe('Collection', function() {
  before(function(done) {
    setup(function() {
      mongodb.MongoClient.connect('mongodb://localhost:27017/test', function(err, _db) {
        if (err) {
          return done(err);
        }
        var db = _db;
        async.series([function(callback) {
          var foodDocs = _.range(0, 400).map(function(i) {
            return {
              _id: 'food_' + i,
              weight: i % 5,
              length: i * 17 % 11
            };
          });
          db.collection('food').insert(foodDocs, callback);
        }, function(callback) {
          db.collection('food').createIndex({
            weight: 1
          }, callback);
        }, function(callback) {
          db.collection('food').createIndex({
            length: 1
          }, callback);
        }, function(callback) {
          var bookDocs = _.range(0, 400).map(function(i) {
            return {
              _id: 'book_' + i,
              pages: i + 200,
              editions: i % 7
            };
          });
          db.collection('book').insert(bookDocs, callback);
          /*}, function(callback) {
            var cursor = db.collection('food').find({
              weight: 4
            },
            {
              weight: 1
            }).sort({
                      length: 1
                    });
            callback(null, cursor);*/
        }
        ], function(err) {
          if (err) {
            return done(err);
          }
          done();
        });
      });
    });
  });

  after(function(done) {
    mongodb.MongoClient.connect('mongodb://localhost:27017/test', function(err, _db) {
      if (err) {
        return done(err);
      }
      var db = _db;
      async.series([function(callback) {
        db.dropCollection('food', callback);
      }, function(callback) {
        db.dropCollection('book', callback);
      }
      ], function(err) {
        if (err) {
          return done(err);
        }
        teardown(done);
      });
    });
  });

  // TODO: what information should get have?
  describe.skip('Get', function() {
    it('should get collection data', function(done) {
      GET('/api/v1/localhost:27017/collections/test.food')
        .expect(200)
        .end(function(err, res) {
          console.log(res);
          assert.ifError(err);
          done();
        });
    });
  });

  describe('Find', function() {
    it('should find many documents at once', function(done) {
      var query = {
        weight: 4
      };
      var fields = {
        _id: 0,
        weight: 1,
        length: 1
      };
      GET('/api/v1/localhost:27017/collections/test.food/find')
        .query({
          query: EJSON.stringify(query),
          fields: EJSON.stringify(fields)
        })
        .expect(200)
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.length, 80, 'Should return 80 document');
          for (var i = 0; i < res.body.length; i++) {
            var doc = res.body[i];
            assert.equal(doc.weight, 4);
            assert.deepEqual(Object.keys(doc), Object.keys({
              weight: 1,
              length: 1
            }));
          }
          done();
        });
    });
  });

  describe('Count', function() {
    it('should count many documents', function(done) {
      var query = {
        weight: 4
      };
      GET('/api/v1/localhost:27017/collections/test.food/count')
        .query({
          query: EJSON.stringify(query)
        })
        .expect(200)
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.count, 80, 'Should return 80 document');
          done();
        });
    });
  });

  describe.skip('Sample', function() {
    it('should sample the requested number of documents', function(done) {
      var query = {
        weight: 4
      };
      var fields = {
        _id: 0,
        weight: 1,
        length: 1
      };
      GET('/api/v1/localhost:27017/collections/test.food/sample')
        .query({
          query: EJSON.stringify(query),
          fields: EJSON.stringify(fields),
          size: 9
        })
        .expect(200)
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.length, 9, 'Should return 9 document');
          for (var i = 0; i < res.body.length; i++) {
            var doc = res.body[i];
            assert.equal(doc.weight, 4);
            assert.deepEqual(Object.keys(doc), Object.keys({
              weight: 1,
              length: 1
            }));
          }
          done();
        });
    });
  });

  // TODO: finish this to work
  describe.skip('Bulk', function() {
    it('should do a bulk operation with two inserts, and remove, and an insert', function(done) {
      var insert1 = EJSON.stringify({
        _id: 'newfood-1',
        weight: 15,
        length: 25
      });
      /*var insert2 = {
        _id: 'newfood-2',
        weight: 16,
        length: 26
      };
      var insert3 = {
        _id: 'newfood-3',
        weight: 17,
        length: 27
      };*/
      POST('api/va/localhost:27017/collections/test.food/bulk')
        .query({
          query: EJSON.stringify(insert1)
        })
        .expect(200)
        .end(function(err) {
          assert.ifError(err);
          /*GET('/api/v1/localhost:27017/collections/test.food/find')
            .query({
              query: EJSON.stringify(insert1)
            })
            .expect(200)
            .end(function(err, res) {
              assert.ifError(err);
              assert.equal(res.body.count, 1, 'Should return 1 document');
              GET('/api/v1/localhost:27017/collections/test.food/find')
                .query({
                  query: EJSON.stringify(insert2)
                })
                .expect(200)
                .end(function(err, res) {
                  assert.ifError(err);
                  assert.equal(res.body.count, 1, 'Should return 1 document');
                  GET('/api/v1/localhost:27017/collections/test.food/find')
                    .query({
                      query: EJSON.stringify(insert3)
                    })
                    .expect(200)
                    .end(function(err, res) {
                      assert.ifError(err);
                      assert.equal(res.body.count, 1, 'Should return 1 document');
                      done();
                    });
                });
            });*/
          done();
        });
    });
  });

  describe('Distinct', function() {
    it('should return distinct documents in collection', function(done) {
      GET('/api/v1/localhost:27017/collections/test.food/distinct/weight')
        .expect(200)
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.length, 5, 'Should return 5 keys');
          for (var i = 0; i < 5; i++) {
            assert.equal(res.body[i], i);
          }
          done();
        });
    });
  });

  describe('Aggregate', function() {
    it('should do a 2 step aggregation', function(done) {
      var pipeline = EJSON.stringify([
        {
          $group: {
            _id: '$weight'
          }
        },
        {
          $match: {
            _id: 4
          }
        }
      ]);
      GET('/api/v1/localhost:27017/collections/test.food/aggregate').query({
        pipeline: pipeline
      }).expect(200).end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.length, 1);
        assert.equal(res.body[0]._id, 4);
        done();
      });
    });
  });

  describe('Plans', function() {
    before(function(done) {
      var query = {
        weight: 4
      };
      var fields = {
        weight: 1
      };
      var sort = {
        length: 1
      };
      GET('/api/v1/localhost:27017/collections/test.food/find')
        .query({
          query: EJSON.stringify(query),
          fields: EJSON.stringify(fields),
          sort: EJSON.stringify(sort)
        })
        .end(done);
    });

    // TODO: why doesn't the plan get cached from the above query?
    it.skip('should return the query plans used so far', function(done) {
      var query = {
        weight: 4
      };
      var projection = {
        weight: 1
      };
      var sort = {
        length: 1
      };
      GET('/api/v1/localhost:27017/collections/test.food/plans')
        .query({
          query: EJSON.stringify(query),
          projection: EJSON.stringify(projection),
          sort: EJSON.stringify(sort)
        })
        .expect(200)
        .end(function(err, res) {
          assert.ifError(err);
          console.log(res.body);
          assert.equal(res.body.length, 2, 'Should return 2 possible plans');
          done();
        });
    });

    it('should return the query shapes used so far', function(done) {
      GET('/api/v1/localhost:27017/collections/test.food/plans')
        .expect(200)
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.length, 1, 'Should return 1 shape so far');
          assert.deepEqual(res.body[0], {
            query: {
              weight: 4
            },
            sort: {
              length: 1
            },
            projection: {
              weight: 1
            }
          });
          done();
        });
    });
  });

  describe('Destroy', function() {
    it('should drop a collection', function(done) {
      DELETE('/api/v1/localhost:27017/collections/test.book')
        .expect(204)
        .end(function(err) {
          assert.ifError(err);
          GET('/api/v1/localhost:27017/databases/test')
            .expect(200)
            .end(function(err, res) {
              assert.ifError(err);
              for (var i = 0; i < res.body.length; i++) {
                assert.notEqual(res.body.collections[i].name, 'book');
              }
              done();
            });
        });
    });
  });

  describe('Post', function() {
    it('should create a capped collection', function(done) {
      POST('/api/v1/localhost:27017/collections/test.book')
        .query({
          capped: 1,
          max: 1000
        })
        .expect(201)
        .end(function(err) {
          assert.ifError(err);
          GET('/api/v1/localhost:27017/databases/test')
            .expect(200)
            .end(function(err, res) {
              assert.ifError(err);
              assert.equal(res.body.collections[0].name, 'book');
              assert.equal(res.body.collections[0].is_capped, true);
              done();
            });
        });
    });
  });

  describe('Pet Test Set', function() {
    after(function(done) {
      mongodb.MongoClient.connect('mongodb://localhost:27017/test', function(err, _db) {
        if (err) {
          return done(err);
        }
        var db = _db;
        async.series([function(callback) {
          db.dropCollection('pets', callback);
        }
        ], function(err) {
          if (err) {
            return done(err);
          }
          done();
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
});
