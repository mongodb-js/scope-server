var boom = require('boom');
var async = require('async');
var _ = require('lodash');
var Deployment = require('mongodb-deployment-model');
var Instance = require('mongodb-instance-model');
var format = require('util').format;

module.exports = {
  get: function(req, res, next) {
    var query = {
      'instances._id': req.params.instance_id
    };
    var model;

    async.waterfall([
      Deployment.findOne.bind(null, query),
      function getInstanceFromDeployment(deployment, cb) {
        if (!deployment) {
          cb(boom.notFound(format('No deployment found with instance id `%s`',
              req.params.instance_id)));
          return;
        }

        model = deployment.instances.get(req.instance_id);
        if (!model) {
          cb(boom.notFound());
          return;
        }
        cb();
      },
      Instance.fetch.bind(null, req.mongo)
    ], function(err, detail) {
      if (err) {
        return next(err);
      }
      var data = _.extend(model.serialize(), detail);
      res.send(data);
    });
  }
};
