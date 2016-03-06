/**
 * The [socket.io](http://socket.io/) server which
 * allows any server method (currently limited to sample only)
 * to be consumed as a true stream by the client.
 *
 * This is the socket.io equivalent of `routes/*.js`
 * in express terms.
 */
var io = module.exports = require('socket.io')();
var ss = require('socket.io-stream');

var series = require('async').series;
var _ = require('lodash');
var partial = _.partial;
var assign = _.assign;
var clone = _.clone;
var miss = require('mississippi');
var prettyHrtime = require('pretty-hrtime');

var config = require('mongoscope-config');
var createSampleStream = require('mongodb-collection-sample');
var EJSON = require('mongodb-extended-json');
var unpackNamespaceParam = require('./params/ns');
var typedParams = require('./middleware/typed-params');
var sampleOptions = require('./middleware/sample-options');
var collectionRequired = require('./middleware/collection-required');
var Token = require('./models/token');
var debug = require('debug')('mongodb-scope-server:io');


/**
 * The socket.io version of `lib/moddleware/token-required.js`
 * which will handle validating and decoding authentication
 * tokens the client sends as socket.io messages instead
 * of HTTP headers.
 */
io.on('connection', require('socketio-jwt').authorize({
  secret: config.get('token:secret').toString('utf-8')
}));

/**
 * A small helper which allows us to just use all of our
 * existing `./middleware/*.js` and `./params/*.js`
 * targeted at express with socket.io.  This is in
 * an effort to reuse as much code as possible and
 * lower the probability of "oops" bugs, as in
 * "Oops! I changed it in middleware/ns.js and tested
 * it, but I forgot got to update it in io.js :(".
 *
 * @see https://medium.com/@osklopez/sharing-express-session-data-with-socket-io-190b4237f60e
 *
 * @param {socket.io.Socket} socket - http://socket.io/docs/server-api/#socket
 * @param {Object} req - Request data sent by the client.
 * @param {Function} done
 */
function applyMiddleware(socket, req, done) {
  // A stub for the `res` argument express usually provides.
  var res = {};

  // Map the socket.io request into a `req` like stub as well.
  var params = clone(req);
  assign(params, {
    session_id: socket.decoded_token.session_id,
    deployment_id: socket.decoded_token.deployment_id
  });

  req = {
    params: params,
    query: {},
    body: {}
  };

  // Yay! Now we can just use all of our existing middleware!
  series({
    'Load token data': partial(Token.load, socket.decoded_token, req),
    'Add typed param getters': partial(typedParams, req, res),
    'Parse the namespace param if presented': function(next) {
      unpackNamespaceParam(req, res, next, req.params.ns);
    },
    'The collection must already exist': partial(collectionRequired, req, res),
    'Parse sample options': partial(sampleOptions, req, res)
  }, function(err) {
    if (err) {
      return done(err);
    }
    debug('middleware applied successfully', req);
    done(null, req);
  });
}

function streamer(socket, next) {
  return function(res, params) {
    debug('client sent params `%j`', params);
    applyMiddleware(socket, params, function(err, req) {
      if (err) {
        debug('request did not make it through middleware', err);
        return res.emit('error', err);
      }
      next(req, res);
    });
  };
}

function getCollectionSample(req, res) {
  var d = require('debug')('mongodb-scope-server:io:collection:sample');

  d('parsed options `%j`', req.params.sample_options);

  var db = req.mongo.db(req.params.database_name);
  var collectionName = req.params.collection_name;
  var opts = req.params.sample_options;

  /**
   * We'll serialize using mongodb-extended-json so each
   * document arrives to the client with detailed bson types
   * intact.
   *
   * * @see https://jira.mongodb.org/browse/INT-506
   */
  var serialize = miss.through({objectMode: true}, function(chunk, enc, cb) {
    cb(null, EJSON.serialize(chunk));
  });

  var start = process.hrtime();
  var src = createSampleStream(db, collectionName, opts);

  miss.pipe(src, serialize, res, function(err) {
    var end = process.hrtime(start);
    if (err) {
      d('Error while sampling: ', err);
      return;
    }
    d('Successfully sampled in', prettyHrtime(end, {
      verbose: true
    }));
  });
}


/**
 * Finally, setup the listeners to handle
 * incoming stream requests from the client,
 * applying our middleware to handle authentication and
 * finally connecting the client stream to a readable
 * stream around the node.js driver.
 *
 * @see [mongodb-scope-client#Client.prototype.createReadStream](http://git.io/vGxcW)
 * @see https://www.npmjs.com/package/socket.io-stream
 */
io.on('connection', function(socket) {
  ss(socket).on('collection:sample', streamer(socket, getCollectionSample));
});
