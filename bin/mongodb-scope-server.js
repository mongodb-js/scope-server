#!/usr/bin/env node

'use strict';
const cli =  require('./cli');
const server = require('../background');
const ms = require('ms');

/**
 * How to use `yargs` like a Wizzard:
 * - https://github.com/bcoe/yargs
 * - http://reverentgeek.com/ahoy-parse-ye-node-js-command-args-with-yargs/
 * - http://blog.nodejitsu.com/npmawesome-parsing-command-line-options-with-yargs/
 */
const argv = require('yargs')
  .usage('mongodb-scope-server <command>')
  .wrap(120)
  .command('start', 'launch as background process', function(yargs, argv){
    /**
     * TODO (imlucas): Needs to be moved into `../background#start`
     * let _reaper;
     * if (argv.test) {
     *   cli.warn('start', 'Test mode activated!  Server will be killed if it is not stopped in 15 minutes');
     *   _reaper = setTimeout(function() {
     *     server.stop(function() {
     *       cli.abort('start', '15 minute limit reached while in test mode!');
     *     });
     *   }, ms('15 minutes'));
     * }
     */
     server.start(function() {
       console.log('Server started!');
     });
  })
  .command('stop', 'stop if already running in the background')
  .command('status', 'current server state')
  .command('help', '<command>', function(yargs, _argv) {
    argv = yargs.alias('h', 'help')
    .help('help')
    .argv;

    cli.debug('help', {argv, _argv});
  })
  .option('dev', {
    description: 'Development mode',
    type: 'boolean',
    default: false
  })
  .option('test', {
    description: 'Testing mode',
    type: 'boolean',
    default: false
  })
  .option('debug', {
    description: 'Print extended debugging messages to the console',
    type: 'boolean',
    default: false
  })
  .example('$0 start --dev', 'Start in a background process in development mode.')
  .help('help').alias('h', 'help')
  .epilogue(`
    Environment Variables:
      mongodb.version         MONGODB_VERSION
      mongodb.topology        MONGODB_TOPOLOGY
      mongodb.enterprise      MONGODB_ENTERPRISE
`).argv;

if (argv.debug === true) {
  process.env.DEBUG = '*';
}

const debug = require('debug')('mongodb-scope-server:bin');

debug('argv is', argv);

if (argv.test === true) {
  debug('Running in `test` mode');
  process.env.NODE_ENV = 'testing';
} else if (argv.dev === true) {
  process.env.NODE_ENV = 'development';
  debug('Running in `dev` mode');
} else {
  debug('Running in `production` mode');
  process.env.NODE_ENV = 'production';
}
