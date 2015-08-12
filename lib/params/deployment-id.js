/**
 * Validates any `:deployment_id` values in a URL, autoloading
 * the deployment metadata into `req.deployment`.
 */
var validate = require('../validate');
var Instance = require('../models/instance');

module.exports = function unpack_param_deployment_id(req, res, next, _id) {
  req.params.deployment_id = Instance.getId(_id);
  validate.middleware('deployment_id', 'id')(req, res, next, _id);
};
