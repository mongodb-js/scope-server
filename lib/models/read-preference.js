// @note (imlucas): Yes, gross...  but only way to get an instanceof
// check in the belly of the driver to not barf.
var ReadPreference;
try {
  ReadPreference = require('mongodb/node_modules/mongodb-core').ReadPreference;
} catch (e) {
  ReadPreference = require('mongodb-core').ReadPreference;
}

module.exports = ReadPreference;
