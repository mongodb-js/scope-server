/**
 * Validates any `:deployment_id` values in a URL.
 */
var validate = require('../validate');
var Deployment = require('mongodb-deployment-model');

module.exports = function unpack_param_deployment_id(req, res, next, _id) {
  req.params.deployment_id = Deployment.getId(_id);
  validate.middleware('deployment_id', 'id')(req, res, next, _id);
};
