/*eslint new-cap:0*/
var helper = require('./helper');
var GET = helper.GET;
var setup = helper.setup;
var teardown = helper.teardown;

// Root methods of the API
describe('/', function() {
  before(setup);
  after(teardown);
  it('should redirect to the root of the current version', function(done) {
    GET('/api').expect(302).end(done);
  });
  it('should have a discoverable root', function(done) {
    GET('/api/v1').expect(200).end(done);
  });
  it('should have a health-check', function(done) {
    GET('/health-check').expect(200).end(done);
  });
});
