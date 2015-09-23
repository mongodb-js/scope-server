#!/usr/bin/env node

var chalk = require('chalk');
var figures = require('figures');
var format = require('util').format;
var server = require('../');
var versions = server.versions;

server.start(function(err) {
  if (!err) {
    console.log('  ',
      chalk.green(figures.tick),
      ' scout-server',
      chalk.bold(format('v%s', versions['scout-server'])),
      'listening on', chalk.bold(server.config.get('listen')));
    return;
  }
  if (err.code === 'EADDRINUSE') {
    console.log('  ',
      chalk.yellow(figures.warning),
      ' Failed to start scout-server on', chalk.bold(server.config.get('listen')),
      '. Are you running scout-server in another tab already?');
    return;
  }

  console.log('  ',
    chalk.bold.underline.red(figures.cross,
      ' scout-server failed to start!\n'), err.stack || JSON.stringify(err));
});
