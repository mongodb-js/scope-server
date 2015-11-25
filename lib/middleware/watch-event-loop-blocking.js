function blocked(fn) {
  var start = process.hrtime();
  var interval = 100;

  return setInterval(function() {
    var delta = process.hrtime(start);
    var nanosec = delta[0] * 1e9 + delta[1];
    var ms = nanosec / 1e6;
    var n = ms - interval;
    if (n > 10) {
      fn(Math.round(n));
    }
    start = process.hrtime();
  }, interval);
}


module.exports = function(req, res, next) {
  req.blocked = 0;
  var check = blocked(function(ms) {
    req.blocked = ms;
  });
  check.unref();

  var _onRequestFinished;

  function cleanup() {
    check.ref();
    clearInterval(check);
    res.removeListener('finish', _onRequestFinished);
  }


  _onRequestFinished = function() {
    /* eslint no-console:0 */
    if (req.blocked > 0) {
      /**
       * TODO (imlucas) Call `mongodb-js-metrics.track()` instead of
       * just logging to console.
       */
      console.error('%s blocked the event loop for %sms',
        req.url, req.blocked || 0);
    }
    cleanup();
  };

  res.once('finish', _onRequestFinished);
  res.once('error', cleanup);
  res.once('close', cleanup);

  next();
};
