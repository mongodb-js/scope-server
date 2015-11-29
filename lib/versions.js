/**
 * Versions of the important stuff the server is
 * using that is essential when the rare but
 * very hairest of problems.
 */
var _ = require('lodash');

module.exports = _.extend(process.versions, {
  'mongodb-scope-server': require('../package.json').version,
  'mongodb-connection-model': require('mongodb-connection-model/package.json').version,
  'mongodb-deployment-model': require('mongodb-deployment-model/package.json').version,
  'mongodb-instance-model': require('mongodb-instance-model/package.json').version,
  express: require('express/package.json').version,
  'socket.io': require('socket.io/package.json').version,
  'socket.io-stream': require('socket.io-stream/package.json').version
});
