var redis = require("redis");

var DEFAULT_HOST = "127.0.0.1";
var DEFAULT_PORT = 6379;
var DEFAULT_DB   = 0;

function createClient(host, port, db) {
  var client = redis.createClient(
    port || DEFAULT_PORT,
    host || DEFAULT_HOST
  );

  if (db || 0 !== DEFAULT_DB) {
    client.select(db);
  }

  return client;
}

function expand(data) {
  if (data && data.last_activity) {
    // bring it back to a date object
    data.last_activity = new Date(data.last_activity);
  }

  return data;
}

function scrub(data) {
  if (data && data.last_activity) {
    // save as ISO string
    data.last_activity = data.last_activity.toISOString();
  }

  return data;
}

exports.create = function (BaseStore, host, port, db) {
  var client = createClient(host, port, db);

  return Object.create(BaseStore, {
    get: {
      value: function (path, cb) {
        var that = this;

        client.hgetall(path, function (err, res) {
          that.notify(cb, expand(res) || undefined);
        });
      }
    },
    getTarget: {
      value: function (path, cb) {
        var that = this;

        this.get(path, function (data) {
          if (!data) {
            that.notify(cb);
            return;
          }

          that.notify(cb, {
            prefix: path,
            data: data
          });
        });
      }
    },
    getAll: {
      value: function (cb) {
        var that = this;

        client.keys("*", function (err, keys) {
          if (err || keys.length === 0) {
            that.notify(cb, {});
            return;
          }

          var routes = {};
          var multi  = client.multi();

          // queue up a command per key
          keys.forEach(function (key) { multi.hgetall(key); });

          multi.exec(function (err, values) {
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
          that.notify(cb);
        });
      }
    },
    update: {
      value: function (path, data, cb) {
        var that = this;

        this.get(path, function (current) {
          client.hmset(path, Object.assign(current, scrub(data)), function (err, res) {
            that.notify(cb);
          });
        });
      }
    },
    remove: {
      value: function (path, cb) {
        var that = this;

        client.del(path, function (err, res) {
          that.notify(cb);
        });
      }
    },
    hasRoute: {
      value: function (path, cb) {
        var that = this;

        client.exists(path, function (err, res) {
          that.notify(cb, res === 1);
        });
      }
    }
  });
};
