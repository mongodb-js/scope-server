/* eslint complexity:0 */
/**
 * TODO (imlucas) Switch to getsentry.com.
 * TODO (imlucas) :axe: to `mongodb-js-metrics`.
 */
var TOKEN = '146d70d68e5000217eb90eb776857f22';

function requestInfo(req) {
  var connection = req.connection;
  var address = connection && connection.address();
  var portNumber = address && address.port;
  var port = !portNumber || portNumber === 80 || portNumber === 443 ? '' : ':' + portNumber;
  var full_url = req.protocol + '://' + (req.hostname || req.host) + port + req.url;
  var request = {
    url: full_url,
    path: req.path || req.url,
    method: req.method,
    headers: req.headers
  };

  if (req.params && typeof req.params === 'object' && Object.keys(req.params).length > 0) {
    request.params = req.params;
  }

  if (req.query && typeof req.query === 'object' && Object.keys(req.query).length > 0) {
    request.query = req.query;
  }

  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    request.body = req.body;
  }

  if (connection) {
    request.remote_address = connection.remoteAddress || req.ip;
    request.remote_port = connection.remotePort;
    request.bytes_read = connection.bytesRead;
    request.bytes_written = connection.bytesWritten;
    request.local_port = portNumber;
    request.local_address = address ? address.address : undefined;
  }
  return {
    request: request
  };
}

var path = require('path');
var bugsnag = require('bugsnag');
var options = {
  projectRoot: path.resolve(__dirname, '../')
};
options.packageJSON = path.join(options.projectRoot, 'package.json');

bugsnag.register(TOKEN, options);

module.exports = bugsnag;
module.exports.requestInfo = requestInfo;
