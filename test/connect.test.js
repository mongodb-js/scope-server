var _ = require('lodash');
var assert = require('assert');
var connect = require('mongodb-connection-model').connect;
var format = require('util').format;
var Instance = require('mongodb-instance-model');
var Connection = require('mongodb-connection-model');

var fixtures = require('mongodb-connection-fixture').MATRIX.map(function(model) {
  return new Connection(model);
});

if (fixtures.length > 0) {
  describe('functional #slow', function() {
    _.map(_.groupBy(fixtures, 'authentication'), function(models, authentication) {
      describe(format('Using authentication `%s`', authentication), function() {
        _.each(models, function(model) {
          describe(model.name, function() {
            var db;
            it('should connect', function(done) {
              if (process.env.dry) {
                this.skip();
                return;
              }
              this.slow(5000);
              this.timeout(10000);

              connect(model, function(err, _db) {
                if (err) {
                  return done(err);
                }
                db = _db;
                done();
              });
            });

            it('should list collections', function(done) {
              if (process.env.dry) {
                this.skip();
                return;
              }
              this.slow(5000);
              this.timeout(10000);
              assert(db);
              Instance.fetch.getDatabaseCollections(db, done);
            });

            it('should get instance details', function(done) {
              if (process.env.dry) {
                this.skip();
                return;
              }

              this.slow(5000);
              this.timeout(10000);
              assert(db);
              Instance.fetch(db, done);
            });

            after(function() {
              if (db) {
                db.close();
              }
            });
          });
        });
      });
    });
  });
}
