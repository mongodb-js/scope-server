var assert = require('assert');
var connect = require('mongodb-connection-model').connect;
var format = require('util').format;
var Instance = require('mongodb-instance-model');
var fixtures = require('mongodb-connection-fixture').MATRIX;

var shouldGetInstanceDetails = function(db, done) {
  assert(db);
  Instance.fetch(db, done);
};

if (fixtures.length > 0) {
  describe('functional #slow', function() {
    fixtures.map(function(model) {
      it(format('should connect to `%s`', model.name), function(done) {
        this.slow(5000);
        this.timeout(10000);

        connect(model, function(err, _db) {
          if (err) {
            return done(err);
          }
          shouldGetInstanceDetails(_db, done);
        });
      });
    });
  });
}
