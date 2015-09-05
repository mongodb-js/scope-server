/**
 * A handler to validate any `:instance_id` values in a URL.
 */
var validate = require('../validate');
var Instance = require('../models/instance');

module.exports = function unpack_param_instance_id(req, res, next, _id) {
  req.params.instance_id = Instance.getId(_id);
  validate.middleware('instance_id', 'id')(req, res, next, _id);
};
