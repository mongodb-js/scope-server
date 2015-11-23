#!/usr/bin/env node
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

/**
 * @todo (imlucas) Figure out how to make nodemon or another
 * proc monitor work under electron.
 */
require('./mongodb-scope-server-worker');
