'use strict';

const chalk = require('chalk');
const figures = require('figures');
const clui = require('clui');

const COLORS = new Map([
  [figures.tick, 'green'],
  [figures.warning, 'yellow'],
  [figures.cross, 'red'],
  [figures.info, 'gray']
]);

class CLI {
  constructor() {
    this._spinner = null;
    this.debug = require('debug')('mongodb-scope-server:cli');
  }
  spinner(msg) {
    if (process.env.CI) {
      // Don't show spinner's when running in CI
      // as it makes the build log utterly useless...
      console.log(`${msg}${figures.ellipsis}`);
      return this;
    }
    this.stopSpinner();
    this._spinner = new clui.Spinner(`${msg}${figures.ellipsis}`);
    this._spinner.start();
    return this;
  }

  stopSpinner() {
    if (this._spinner) {
      this._spinner.stop();
    }
    return this;
  }

  _printMessage(icon, command, msg) {
    this.stopSpinner();

    const color = COLORS.get(icon) || 'white';
    /* eslint no-console:0 */
    if (!msg) {
      console.log(chalk.bold[color](icon), ` ${command}`);
      return this;
    }
    command = command.replace(/ /g, ` ${figures.pointerSmall}`);
    console.log(`${chalk.bold[color](icon)}  ${chalk.gray(command)}  ${msg}`);
    return this;
  }

  info(command, msg) {
    return this._printMessage(figures.info, command, msg);
  }

  ok(command, msg) {
    return this._printMessage(figures.tick, command, msg);
  }

  warn(command, msg) {
    return this._printMessage(figures.warning, command, msg);
  }

  error(title, err) {
    this.stopSpinner();

    if (title instanceof Error) {
      err = title;
    }

    if (err) {
      console.error(chalk.red(figures.cross), `  Error: ${title}`);
      err.stack.split('\n').map(function(line) {
        console.error(chalk.gray(line));
      });
      return this;
    }
    console.error(chalk.red(figures.cross), title);
    return this;
  }
  abortIfError(err) {
    if (!err) return this;
    this.error(err);
    process.exit(1);
  }

  abort(err) {
    this.error(err);
    process.exit(1);
  }
}

module.exports = new CLI();
