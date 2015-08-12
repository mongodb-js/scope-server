var toTitleCase = require('titlecase');
var longestCommonSubstring = require('longest-common-substring');
var _ = require('lodash');
var format = require('util').format;

function getSubdomain(instanceId) {
  if (typeof instanceId !== 'string') {
    instanceId = '' + instanceId;
  }
  try {
    var host = instanceId.split(':')[0];
    var sub = host.split('.')[0];
    return toTitleCase(sub.replace(/-/g, ' '));
  } catch (e) {
    return instanceId;
  }
}

function shorten(names) {
  var overlap = detectOverlap(names);
  if (overlap.length === 0) {
    return names;
  }

  overlap.names = _.map(names, function(name) {
    return name.replace(overlap.sequence, '');
  });
  return overlap;
}

function detectOverlap(names) {
  var res = {
    length: 1000
  };

  for (var i = 0; i < names.length - 1; i++) {
    var r = longestCommonSubstring(names[i].split(':')[0], names[i + 1].split(':')[0]);
    if (r.length === 0) {
      res = null;
      break;
    }
    if (r.length < res.length) {
      res = r;
    }
  }
  return res;
}

module.exports = function(deployment) {
  var name = '';

  if (!deployment.hasReplication()) {
    name = getSubdomain(deployment._id);
    // Only have an ip address
    if (/^\d+$/.test(deployment.name)) {
      name = deployment._id;
    }
    deployment.name = name;
    deployment.instances[0].name = name;
  } else {
    var shortened = shorten(deployment.instance_ids);
    var subdomain = getSubdomain(shortened.sequence) || deployment._id;
    var typeCounter = {};

    name = format('%s on %s', deployment.type, subdomain);

    shortened.names.map(function(s, i) {
      var instance = deployment.instances[i];
      var type = instance.type || instance.shard || instance.state;

      if (!typeCounter[type]) {
        typeCounter[type] = 0;
      }
      typeCounter[type]++;

      deployment.instances[i].name = format('%s.%s', type, typeCounter[type]);
    });
  }
};
