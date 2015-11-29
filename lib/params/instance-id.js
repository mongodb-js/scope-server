/**
 * A handler to validate any `:instance_id` values in a URL.
 */
var validate = require('../validate');
var Instance = require('mongodb-instance-model');
var boom = require('boom');
var _ = require('lodash');

module.exports = function unpack_param_instance_id(req, res, next, _id) {
  if (_.contains(['none', 'undefined', 'null', '0'], _id + ''.toLowerCase())) {
    next(boom.badRequest('Check your script.  instance_id value looks like a typo `' + _id + '`'));
    return;
  }

  req.params.instance_id = Instance.getId(_id);
  validate.middleware('instance_id', 'id')(req, res, next, _id);
};
