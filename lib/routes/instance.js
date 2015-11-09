var boom = require('boom');
var async = require('async');
var _ = require('lodash');
var store = require('../models/store');
var Instance = require('../models/instance');

module.exports = {
  get: function(req, res, next) {
    var query = {
      'instances._id': req.params.instance_id
    };
    var model;

    async.waterfall([
      store.findOne.bind(null, query), function getInstanceFromDeployment(deployment, cb) {
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
