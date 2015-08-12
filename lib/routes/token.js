var boom = require('boom');
var Token = require('../models/token');
var Session = require('../models/session');
var Instance = require('../models/instance');
var Deployment = require('../models/deployment');
var debug = require('debug')('scout-server:routes:token');

function create(deployment, req, res, next) {
  req.deployment = deployment;
  return Token.create(req, function(err, data) {
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
}

module.exports.destroy = function(req, res, next) {
  if (!req.session_id) {
    return next(new Error('No session_id make sure your middleware is configured.'));
  }
  debug('destroying ');

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
  var url = req.body.seed;
  var ctx;
  if (!url) {
    return next(boom.badRequest('Missing required param `seed`'));
  }

  ctx = {
    instance_id: Instance.getId(url),
    seed: url
  };

  var opts = {
    timeout: req.int('timeout', 1000),
    auth: {}
  };

  if (req.body.mongodb_username) {
    opts.auth.mongodb = {
      username: req.body.mongodb_username,
      password: req.body.mongodb_password,
      authdb: req.body.mongodb_authdb || 'admin'
    };
    if (opts.auth.mongodb_password) {
      return next(boom.badRequest('Missing `mongodb_password` param'));
    }
  }
  if (req.params.ssh_key) {
    opts.auth.ssh = {
      username: req.params.ssh_username,
      key: req.params.ssh_key
    };
  }
  ctx.auth = opts.auth;

  debug('get deployment for `%s`', url);
  Deployment.get(url, opts, function(err, deployment) {
    if (err) {
      return next(err);
    }

    if (deployment) {
      return create(deployment, ctx, res, next);
    }

    Deployment.create(url, opts, function(err, deployment) {
      if (err) {
        return next(err);
      }

      return create(deployment, ctx, res, next);
    });
  });
};
