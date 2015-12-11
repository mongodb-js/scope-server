# curl party

The quality of an API is inverse to the number of times you need to
run curl to do something useful.

```bash
# assumptions: auth=false and mongod and scope running on localhost on the default ports
# Let's just ping the api and see what it does
curl -X GET http://localhost:29017/api/v1/;

export TOKEN=`curl -H "Accept: text/plain" -s http://localhost:29017/api/v1/token -d "seed=localhost:27017"`;
echo "Here is an auth token.  It's valid for about an hour: $TOKEN";

# Lot's of things in MongoDB can be consumed in all sorts of different ways,
# and scope wants to make it as easy as possible for you to do anything.
#
# As you saw above with token generation, scope is highly responsive
# to content negotiation.  In most cases, and judging by your 'I ♥ JSON' t-shirt',
# you'll want to use json:

curl -s -H "Authorization: Bearer $TOKEN" -H 'Accept: application/json' http://localhost:29017/api/v1/ | json -o inspect;

# And you should get some output along the lines of:
# [
#   {
#     "_id": "lucass-macbook-air.local:27017",
#     "seed": "lucass-macbook-air.local:27017",
#     "instances": [
#       {
#         "_id": "lucass-macbook-air.local:27017"
#       }
#     ]
#   }
# ]
#
# TODO: intro to deployments and instances?
#
# Content negotiation allows much more than that though.  Let's take top
# for example. Top can respond to a normal REST style read:
curl -s -H "Authorization: Bearer $TOKEN" -H 'Accept: application/json' http://localhost:29017/api/v1/localhost:27017/top;

# That's ... OK but top is really powerful and best consumed over time.
# What if we could just make one request that will keep sending us up to
# the second updates about what is actually happening on the instance?
# Turns out, the smart folks of the internet already have a protocol for that
# called "Server-Sent Events":
curl -s -X GET -H "Accept: text/event-stream" -H "Authorization: Bearer $TOKEN" "http://localhost:29017/api/v1/localhost:27017/top" | json -o inspect;

# Pretty nice, eh?  If your instance isn't doing anything, notice how you're
# still connected but not getting any updates.  Go ahead and run some queries
# on your instance and watch your terminal dance.  Hit ctrl+c to continue.
#
# You can do this for just about any of the scope api calls.  How about
# `db.currentOp()`?
curl -s -X GET -H "Accept: text/event-stream" -H "Authorization: Bearer $TOKEN" "http://localhost:29017/api/v1/localhost:27017/ops";

# ------------------------------------------------------------------------------
# Replication
# ------------------------------------------------------------------------------
# Say we want to nom nom all oplog events nom nom.  First, we'll need to
# get a new token for our replicaset:
export TOKEN=`curl -H "Accept: text/plain" -s http://localhost:29017/api/v1/token -d "seed=localhost:6000"`;

# Now we can just sit back and watch to action:
curl -s -X GET -H "Accept: text/event-stream" -H "Authorization: Bearer $TOKEN" "http://localhost:29017/api/v1/localhost:6000/replication/oplog";

# That's cool but what if you wanted to write a little script that made your
# terminal BELL every time someone with a mongodb email address created an
# signed up for your app?
# BOOM.  scope supports filtering your view of le' oplog!
export FILTERS='[["collection", "users"], ["email", "mongodb.com$"]]';
curl -X GET -H "Accept: text/event-stream" -H "Authorization: Bearer $TOKEN" "http://localhost:29017/api/v1/localhost:6000/replication/oplog" --data-urlencode "filters=$FILTERS";

# Wouldn't it be event better if now that you have your terminal BELL script,
# you could get notified when instances in your replica set get the blues?
# You can watch for replication events like reconnects, joins, and leaves:
curl -X GET -H "Accept: text/event-stream" -H "Authorization: Bearer $TOKEN" "http://localhost:29017/api/v1/localhost:6000/replication";
```
