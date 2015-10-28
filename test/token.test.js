/* eslint new-cap:0 no-shadow:0 */
var assert = require('assert');
var supertest = require('supertest');
var EJSON = require('mongodb-extended-json');
var app = require('../');
var helper = require('./helper');
var setup = helper.setup;
var teardown = helper.teardown;
var POST = helper.POST;

var Session = require('../lib/models/session');

describe('Tokens', function() {
  describe('sanity', function() {
    before(setup);
    after(function(done) {
      helper.connect(done, function(db) {
        db.dropCollection('dogs', function() {
          teardown(done);
        });
      });
    });

    it.skip('should not allow us to create a collection without a token', function(done) {
      supertest(app)
        .post('/api/v1/localhost:27017/collections/test.dogs')
        .accept('json')
        .type('json')
        .expect(403)
        .end(done);
    });

    it.skip('should not allow us to create a collection with a bad token', function(done) {
      supertest(app)
        .post('/api/v1/localhost:27017/collections/test.dogs')
        .accept('json')
        .type('json')
        .set('Authorization', 'Bearer BADTOKEN')
        .expect(400)
        .end(done);
    });

    it('should allow us to create a collection with a token', function(done) {
      POST('/api/v1/localhost:27017/collections/test.dogs')
        .expect(201)
        .end(done);
    });
  });

  describe('regressions', function() {
    describe('INT-702: token expiration', function() {
      var token;
      var now = new Date();
      it('should get a token', function(done) {
        supertest(app)
          .post('/api/v1/token')
          .send({
            hostname: 'localhost',
            port: 27017
          })
          .expect(201)
          .expect('Content-Type', /json/)
          .accept('json')
          .type('json')
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            token = EJSON.deflate(res.body);
            done();
          });
      });

      it('should include the session_id', function() {
        assert(token.session_id);
      });

      it('should include the encoded token', function() {
        assert(token.token);
      });

      it('should include the deployment details', function() {
        assert.equal(token.deployment_type, process.env.MONGODB_TOPOLOGY || 'standalone');
        assert.equal(token.deployment_id, 'localhost:27017');
        assert.equal(token.instance_id, 'localhost:27017');
      });

      it('should have a created_at timestamp thats about right', function() {
        assert(now.getTime() <= token.created_at.getTime() + 1000);
      });

      it('should have the correct expires_at value', function() {
        var lifetime_ms = token.expires_at.getTime() - token.created_at.getTime();
        assert.equal(lifetime_ms, app.config.get('token:lifetime') * 60 * 1000);
      });

      it('should be able to retrieve the connection for the session', function(done) {
        Session.get(token.session_id, function(err, session) {
          if (err) {
            return done(err);
          }
          assert(session);
          done();
        });
      });
    });
  });
});
