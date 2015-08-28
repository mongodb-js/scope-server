## Philosophy

- Style is for tailors.
- README driven development.
- Motivating factors are risk mitigation & communication,
  not to "have tons of tests".
- Forces diligence around DX/build tools e.g.
  `npm install && npm test` needs to be bulletproof for CI
  therefore, when a new developer starts working on the project
  they are immediately productive.
- The Buddy System
  1. Help your Buddies!
    - Real people are using your modules and even more people
      responsible for user support & devops on the applications
      that use them.
  2. Trust your Buddies!
    - node.js driver has lots and lots of tests -> don’t need to
      reimplement their entire test suite
    - Needlessly pinning exact semver versions :(

## Taxonomy

- Instead of just using a bunch of jargon that's just going to
  confuse readers, here's a little primer.
- selenium, mocha, travis, etc
- Can mostly just be pulled from/added as updates to
[services.md][services.md] & [modules.md][modules.md]

### Environments

- `server` node.js, io.js, electron's main process etc. Just
  a binary calling your code.
- `browser` Chrome, electron renderer process, etc.
  You using Chrome, WebDriver using Chrome/electron

## Scheme

- Don't repeat too much.
- Trade-off between exhaustive testing and DX (e.g. "I'll just comment out all of these slow tests for now and put them back later <never puts them back>")

```
<testing pyramid diagram>

box_height = exhaustiveness of testing not to scale

                            ---------
                            | scout |
                            ---------
                ----------------  ----------------
                |              |  |              |
                | scout-client |  | scout-server |
                ----------------  ----------------
    ----------------------------------------------------------
    |                                                         |
    |                                                         |
    |                                                         |
    |                                                         |
    |                      dependencies                       |
    |                                                         |
    |                                                         |
    |                                                         |
    |                                                         |
    ----------------------------------------------------------
```

### scout-client

Run tests in server and browser environments.

Why do we do it this way?

- A well tested black box you just use and don’t have to think about.
- Radical experimentation: Have an idea? Great!  Go build your idea,
  not the connective tissue required to express it.

### scout-server

Run tests in server environment.

Why do we do it this way?

- Provide a strong contract to scout-client that we will
  talk to the node.js driver correctly.
- If it's hard to test, it's probably hard to use.

### scout

Launch real binary and really use the application programmatically.

Why do we do it this way?

- "Does everything tied together actually work?"
- "Did I just break everything... :|"

## Writing Tests

- Test because you want to, not because you have to.
- Difference between `test_count=0` & `test_count=1` is gigantic!
- Start with 1 test that travis runs on every commit
- What is the main thing your module is promising to do?

## Debugging Tests

### `browser`

- zuul: `npm start` -> opens chrome -> use chrome devtools:

<screenshot>

### `server`

- node-inspector: http://blog.andrewray.me/how-to-debug-mocha-tests-with-chrome/

## Code Coverage

- Tool for discovering new areas we could reduce risk around,
  not a metric. 100% coverage creates a dangerous false security.
- Still, like all of our other tools, it must be easy to reach for when you
  want it
- `npm run coverage`

<screenshot of lcov html report>

## Environmental Forces

- Must be dead simple.
- Don't just gloss over a case because it's hard to test.
- e.g. we need to make it an afterthought to test kerberos from
  the driver, not something

### The MongoDB Matrix

- Use [mongodb-version-manager][mongodb-version-manager] to get any
  version of MongoDB available on any system.
- Use [mongodb-runner][mongodb-runner] to start/stop an ephemeral
  MongoDB deployment with any combination of type
  (standalone|replicaset|cluster) + auth (none|basic|x509, etc)
  (@todo: Just call these flavors? There are a finite number of
  viable option combinations...)

[services.md]: https://github.com/mongodb-js/mongodb-js/blob/master/docs/services.md
[modules.md]: https://github.com/mongodb-js/mongodb-js/blob/master/docs/modules.md
[mongodb-dbpath]: https://github.com/mongodb-js/mongodb-dbpath
[mongodb-version-manager]: https://github.com/mongodb-js/mongodb-version-manager
[mongodb-runner]: https://github.com/mongodb-js/mongodb-runner
