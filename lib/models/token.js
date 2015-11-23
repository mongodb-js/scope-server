var _ = require('lodash');
var config = require('mongoscope-config');
var jwt = require('jsonwebtoken');
var boom = require('boom');
var format = require('util').format;
var debug = require('debug')('mongodb-scope-server:models:token');

var Deployment = require('./deployment');
var Session = require('./session');

function shorten(token) {
  return token.substr(0, 8) + '...';
}

function verify(token, fn) {
  debug('verifying `%s`', shorten(token));
  jwt.verify(token, config.get('token:secret').toString('utf-8'), function(err, data) {
    if (err) {
      debug('invalid token', err.message);
      return fn(boom.forbidden(err.message));
    }

    fn(null, data);
  });
}

function mount(tokenData, ctx, next) {
  debug('mounting token data');
  if (!tokenData.session_id) {
    return next(boom.badRequest('Bad token: missing session id'));
  }

  if (!tokenData.deployment_id) {
    return next(boom.badRequest('Bad token: missing deployment_id'));
  }

  ctx.session_id = tokenData.session_id;

  debug('token validated for deployment', tokenData.deployment_id);

  Deployment.get(tokenData.deployment_id, function(err, deployment) {
    if (err) {
      return next(err);
    }
    if (!deployment) {
      return next(boom.badRequest('Bad token: deployment not found'));
    }

    ctx.deployment = deployment;
    if (ctx.instance_id) {
      debug('looking up instance `%s` from `%j`', ctx.instance_id, {
        instances: deployment.instances
      });

      ctx.instance = deployment.instances.get(ctx.instance_id);

      if (!ctx.instance) {
        var msg = format(
          'Tried getting a connection to `%s` but it is not in deployment `%s` %j',
          ctx.instance_id, tokenData.deployment_id, deployment);
        return next(boom.forbidden(msg));
      }
    }

    debug('mounting connection for session', tokenData.session_id);
    Session.mount(tokenData.session_id, ctx, next);
  });
}

module.exports.load = function(token, ctx, next) {
  if (_.isObject(token)) {
    return mount(token, ctx, next);
  }

  if (!_.isString(token)) {
    return next(new TypeError('token must be a string'));
  }

  debug('loading `%s`', shorten(token));
  verify(token, function(err, tokenData) {
    if (err) {
      return next(err);
    }
    debug('verified data `%j`', tokenData);
    mount(tokenData, ctx, next);
  });
};

/**
 * @param {models.Connection} model
 * @param {Function} fn
 */
module.exports.create = function(model, fn) {
  Session.create(model, function(_err, session) {
    if (_err) {
      return fn(_err);
    }

    Deployment.get(model.getId(), function(err, deployment) {
      if (err) {
        return fn(err);
      }

      if (!deployment) {
        return fn(boom.notFound('Deployment not in store! '
          + 'Cannot create token.'));
      }
      var d = {
        deployment_id: deployment.getId(),
        session_id: undefined
      };

      var opts = {
        /**
         * lifetime of the token in seconds.
         */
        expiresIn: config.get('token:lifetime') * 60
      };

      var secret = config.get('token:secret').toString('utf-8');
      var now = Date.now();

      debug('creating token for `%j`', d);
      if (err) {
        return fn(err);
      }
      d.session_id = session._id;

      model.session_id = session._id;
      debug('add session_id to ctx');

      model.mongo = session.connection;
      debug('add connection to ctx');

      var token = jwt.sign(d, secret, opts);
      // @todo (imlucas): `mongodb-token-model` that uses `ampersand-model`.
      var res = {
        id: model.session_id,
        session_id: session._id,
        token: token,
        deployment_type: deployment.type,
        deployment_id: deployment._id,
        instance_id: model.instance_id,
        expires_at: new Date(now + opts.expiresIn * 1000),
        created_at: new Date(now)
      };

      debug('created `%s`', shorten(token));
      fn(null, res);
    });
  });
};
