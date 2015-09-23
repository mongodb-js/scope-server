/* eslint new-cap:0 */
var helper = require('./helper');
var GET = helper.GET;
var POST = helper.POST;
var setup = helper.setup;
var teardown = helper.teardown;

describe('Database', function() {
  before(function(done) {
    setup(function() {
      POST('/api/v1/localhost:27017/databases/test')
        .expect(201)
        .end(function() {
          done();
        });
    });
  });
  after(teardown);

  it('should return database details', function(done) {
    GET('/api/v1/localhost:27017/databases/test').expect(200).end(done);
  });
});
