#!/usr/bin/env node
/* eslint no-console:0 */

const chalk = require('chalk');
const figures = require('figures');
const format = require('util').format;
const server = require('../');
const versions = server.versions;

server.start(function(err) {
  if (!err) {
    console.log('  ',
      chalk.green(figures.tick),
      ' mongodb-scope-server',
      chalk.bold(format('v%s', versions['mongodb-scope-server'])),
      'listening on', chalk.bold(server.config.get('listen')));
    return;
  }
  if (err.code === 'EADDRINUSE') {
    console.log('  ',
      chalk.yellow(figures.warning),
      ' Failed to start mongodb-scope-server on', chalk.bold(server.config.get('listen')),
      '. Are you running mongodb-scope-server in another tab already?');
    return;
  }

  console.log('  ',
    chalk.bold.underline.red(figures.cross,
      ' mongodb-scope-server failed to start!\n'), err.stack || JSON.stringify(err));
});
