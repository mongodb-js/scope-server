var boom = require('boom');
var Token = require('../models/token');
var Session = require('../models/session');
var Deployment = require('../models/deployment');
var Connection = require('mongodb-connection-model');
var debug = require('debug')('scout-server:routes:token');

module.exports.destroy = function(req, res, next) {
  if (!req.session_id) {
    return next(new Error('No session_id make sure your middleware is configured.'));
  }
  debug('destroying session associated with this token...');

  Session.destroy(req.session_id, function(err) {
    if (err) {
      return next(err);
    }
    res.status(200).send({
      success: true
    });
  });
};

module.exports.post = function(req, res, next) {
  /* eslint no-shadow:0 */
  debug('being post handler');
  var model = new Connection(req.body);
  if (!model.isValid()) {
    return next(boom.badRequest(model.validationError.message));
  }

  Deployment.getOrCreate(model, function(err) {
    if (err) {
      return next(err);
    }

    Token.create(model, function(err, payload) {
      if (err) {
        return next(err);
      }
      res.format({
        text: function() {
          res.status(201).send(payload.token);
        },
        default: function() {
          res.status(201).send(payload);
        }
      });
    });
  });
};
