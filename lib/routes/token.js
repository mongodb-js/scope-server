var boom = require('boom');
var Token = require('../models/token');
var Session = require('../models/session');
var Deployment = require('../models/deployment');
var Connection = require('../models/connection');
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
  debug('being post handler');
  var model = new Connection(req.body);
  if (!model.isValid()) {
    return next(boom.badRequest(model.validationError.message));
  }

  Deployment.getOrCreate(model, function(err, deployment) {
    if (err) {
      return next(err);
    }
    req.deployment = deployment;

    Token.create(req, function(err, data) {
      if (err) {
        return next(err);
      }
      res.format({
        text: function() {
          res.status(201).send(data.token);
        },
        default: function() {
          var d = {
            session_id: data.session_id,
            token: data.token,
            deployment_type: data.deployment_type,
            deployment_id: data.deployment_id,
            instance_id: data.instance_id,
            id: data.id,
            expires_at: data.expires_at,
            created_at: data.created_at
          };
          res.status(201).send(d);
        }
      });
    });
  });
};
