/*eslint new-cap:0*/
var helper = require('./helper');
var GET = helper.GET;
var setup = helper.setup;
var teardown = helper.teardown;
var assert = require('assert');

describe('Instance', function() {
  before(setup);
  after(teardown);
  it('should get instance details', function(done) {
    GET('/api/v1/localhost:27017')
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body._id, 'localhost:27017');
        done();
      });
  });
});
