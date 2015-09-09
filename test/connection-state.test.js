var assert = require('assert');
var ConnectionState = require('../lib/models/connection_state');

describe('connection-state validation', function() {
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
});
