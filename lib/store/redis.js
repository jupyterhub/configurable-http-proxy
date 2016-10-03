var log   = require("winston");
var redis = require("redis");

var DEFAULT_HOST = "127.0.0.1";
var DEFAULT_PORT = 6379;
var DEFAULT_DB   = 0;

function createClient (host, port, db) {
  var client = redis.createClient(
    port || DEFAULT_PORT,
    host || DEFAULT_HOST
  );

  if (db || 0 !== DEFAULT_DB) {
    client.select(db);
  }

  return client;
}

function expand (data) {
  if (data && data.last_activity) {
    // bring it back to a date object
    data.last_activity = new Date(data.last_activity);
  }

  return data;
}

function scrub (data) {
  if (data && data.last_activity) {
    // save as ISO string
    data.last_activity = data.last_activity.toISOString();
  }

  return data;
}

function getKeyPaths (path) {
  var key;
  var keys  = [];
  var parts = (path || "").split("/");

  while (parts.length) {
    key = parts.pop();
    keys.push(parts.join("/") + "/" + key);
  }

  return keys.concat("/");
}

function firstDefinedIndex (targets) {
  for (var i = 0; i < targets.length; i++) {
    if (targets[i]) {
      return i;
    }
  }

  return -1;
}

function logErr(err) {
  if (err) {
    log.error("REDIS error:", err);
  }
}

exports.create = function (BaseStore, host, port, db) {
  var client = createClient(host, port, db);

  return Object.create(BaseStore, {
    get: {
      value: function (path, cb) {
        var that = this;

        client.hgetall(path, function (err, res) {
          logErr(err);
          that.notify(cb, expand(res) || undefined);
        });
      }
    },
    getTarget: {
      value: function (path, cb) {
        var that  = this;
        var multi = client.multi();
        var keys  = getKeyPaths(path);

        // push a get call for each key in the path (most specific to most generic)
        keys.forEach(function (key) { multi.hgetall(key); });

        multi.exec(function (err, values) {
          logErr(err);
          if (err || values.length === 0) {
            that.notify(cb);
            return;
          }

          var value;
          var specificIndex = firstDefinedIndex(values);

          if (specificIndex >= 0) {
            value = { prefix: keys[specificIndex], data: values[specificIndex] };
          }

          that.notify(cb, value);
        });
      }
    },
    getAll: {
      value: function (cb) {
        var that = this;

        client.keys("*", function (err, keys) {
          logErr(err);
          if (err || keys.length === 0) {
            that.notify(cb, {});
            return;
          }

          var routes = {};
          var multi  = client.multi();

          // queue up a command per key
          keys.forEach(function (key) { multi.hgetall(key); });

          multi.exec(function (err, values) {
            logErr(err);
            keys.forEach(function (key, index) {
              routes[key] = expand(values[index]);
            });

            that.notify(cb, routes);
          });
        });
      }
    },
    add: {
      value: function (path, data, cb) {
        var that = this;

        client.hmset(path, scrub(data), function (err, res) {
          logErr(err);
          that.notify(cb);
        });
      }
    },
    update: {
      value: function (path, data, cb) {
        var that = this;

        this.get(path, function (current) {
          client.hmset(path, Object.assign(current, scrub(data)), function (err, res) {
            logErr(err);
            that.notify(cb);
          });
        });
      }
    },
    remove: {
      value: function (path, cb) {
        var that = this;

        client.del(path, function (err, res) {
          logErr(err);
          that.notify(cb);
        });
      }
    },
    hasRoute: {
      value: function (path, cb) {
        var that = this;

        client.exists(path, function (err, res) {
          logErr(err);
          that.notify(cb, res === 1);
        });
      }
    }
  });
};
