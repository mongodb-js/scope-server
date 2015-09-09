var assert = require('assert');
var ConnectionState = require('../lib/models/connection_state');

/**
 * This file tests the connection_state object and makes sure that it validates itself properly.
 * Various combinations of state attributes cannot exist together and this ensures that
 * They all are validated. For example, ssl attributes cannot be enabled without ssl being
 * enabled.
 */
describe('connection-state validation', function() {
  it('should allow valid GSSAPI and ssl states', function() {
    var connection = new ConnectionState({
      instance_id: 'localhost:27017',
      auth_mechanism: 'GSSAPI',
      gssapi_service_name: 'mongodb',
      ssl: true,
      ssl_key: 'key'
    });
    assert.equal(connection.isValid(), true);
  });

  it('should not allow specifying GSSAPI as the auth_mechanism without also specifying the service name', function() {
    var connection = new ConnectionState({
      instance_id: 'localhost:27017',
      auth_mechanism: 'GSSAPI'
    });
    assert.equal(connection.isValid(), false);
    assert(connection.validationError instanceof TypeError);
    assert.equal(connection.validationError.message,
      'The `gssapi_service_name` field is required when using GSSAPI as the auth mechanism.');
  });

  it('should not allow specifying gssapi_service_name without using GSSAPI as the auth mechanism', function() {
    var connection = new ConnectionState({
      instance_id: 'localhost:27017',
      auth_mechanism: 'PLAIN',
      gssapi_service_name: 'mongodb'
    });
    assert.equal(connection.isValid(), false);
    assert(connection.validationError instanceof TypeError);
    assert.equal(connection.validationError.message,
      'The `gssapi_service_name` field does not apply when using PLAIN as the auth mechanism.');
  });

  it('should not allow specifying ssl_validate without turning on ssl', function() {
    var connection = new ConnectionState({
      instance_id: 'localhost:27017',
      ssl_validate: true
    });
    assert.equal(connection.isValid(), false);
    assert(connection.validationError instanceof TypeError);
    assert.equal(connection.validationError.message,
      'The `ssl_validate` field requires `ssl = true`.');
  });

  it('should not allow specifying ssl_ca without turning on ssl', function() {
    var connection = new ConnectionState({
      instance_id: 'localhost:27017',
      ssl_ca: ['ca1']
    });
    assert.equal(connection.isValid(), false);
    assert(connection.validationError instanceof TypeError);
    assert.equal(connection.validationError.message,
      'The `ssl_ca` field requires `ssl = true`.');
  });

  it('should not allow specifying ssl_cert without turning on ssl', function() {
    var connection = new ConnectionState({
      instance_id: 'localhost:27017',
      ssl_cert: 'cert'
    });
    assert.equal(connection.isValid(), false);
    assert(connection.validationError instanceof TypeError);
    assert.equal(connection.validationError.message,
      'The `ssl_cert` field requires `ssl = true`.');
  });

  it('should not allow specifying ssl_key without turning on ssl', function() {
    var connection = new ConnectionState({
      instance_id: 'localhost:27017',
      ssl_private_key: 'key'
    });
    assert.equal(connection.isValid(), false);
    assert(connection.validationError instanceof TypeError);
    assert.equal(connection.validationError.message,
      'The `ssl_private_key` field requires `ssl = true`.');
  });

  it('should not allow specifying ssl_vpass without turning on ssl', function() {
    var connection = new ConnectionState({
      instance_id: 'localhost:27017',
      ssl_private_key_password: 'pass'
    });
    assert.equal(connection.isValid(), false);
    assert(connection.validationError instanceof TypeError);
    assert.equal(connection.validationError.message,
      'The `ssl_private_key_password` field requires `ssl = true`.');
  });
});
