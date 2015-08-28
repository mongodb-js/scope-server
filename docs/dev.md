# Dev Guide

### How do I get setup?

1. Follow the [mongodb-js setup guide][mongodb-js-setup]
2. Install [mongodb][mongodb]
3. Clone the repo `git clone git@github.com:10gen/scout-server.git ~/scout-server`
4. Install dependencies `npm install`
5. Start everything up `npm start`

If you've already followed the [mongodb-js setup guide][mongodb-js-setup], just copy and paste the below:

```
git clone git@github.com:10gen/scout-server.git ~/scout-server;
cd ~/scout-server;
npm install;
npm start;
```

### How do I run the tests?

### How do I add a new test?

### How do I just run a single test or a suite?

### How do I debug a test?

[mongodb-js-setup]: https://github.com/mongodb-js/mongodb-js/blob/master/docs/setup.md
[nodejs]: http://nodejs.org/
[mongodb]: http://www.mongodb.org/downloads
[mocha]: http://visionmedia.github.io/mocha/
[mongodb.js]: https://www.npmjs.org/browse/keyword/mongodb.js


git clone git@github.com:10gen/scout.git ./scout;
cd scout;
npm install;

# Get the version numbers of server and server
# the app will use to run the tests.
SERVER_VERSION=`node -e "console.log(require('scout-server/package.json').version)"`
CLIENT_VERSION=`node -e "console.log(require('scout-client/package.json').version)"`
echo "scout-server version: $SERVER_VERSION"
echo "scout-client version: $CLIENT_VERSION"
cd ../;

# Grab the source trees for client and server,
# checkout the version's release tag and run their tests.
git clone git@github.com:10gen/scout-server.git ./scout-server;
cd scout-server;
git checkout "v$SERVER_VERSION";
npm install;
npm test;
cd ../;

git clone git@github.com:10gen/scout-client.git ./scout-client;
cd scout-client;
git checkout "v$CLIENT_VERSION";
npm install;
npm test;
cd ../;
