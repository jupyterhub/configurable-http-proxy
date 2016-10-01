var exec = require("child_process").exec;

var encode = function (value) {
  return new Buffer(JSON.stringify(value)).toString("base64");
};

var decode = function (value) {
  return JSON.parse(new Buffer(value, "base64").toString("utf8"));
};

exports.create = function (BaseStore, command) {
  var runCommand = function (/*command [,arg1, arg2, ...], callback*/) {
    var args     = Array.prototype.slice.apply(arguments);
    var callback = args.pop() || function (err, stdout, stderr) {};

    args.unshift(command);
    exec(args.join(" "), { timeout: 1000 }, callback);
  };

  return Object.create(BaseStore, {
    get: {
      value: function (path, cb) {
        var that = this;

        runCommand("get", path, function (error, stdout, stderr) {
          if (error) {
            that.notify(cb);
            return;
          }

          that.notify(cb, decode(stdout));
        });
      }
    },
    getTarget: {
      value: function (path, cb) {
        this.get(path, function (route) {
          if (!route) {
            this.notify(cb);
            return;
          }

          this.notify(cb, { prefix: path, data: route });
        });
      }
    },
    getAll: {
      value: function (cb) {
        var that = this;

        runCommand("get_all", function (error, stdout, stderr) {
          if (error) {
            that.notify(cb, {});
            return;
          }

          var routes  = JSON.parse(stdout);
          var results = {};

          Object.keys(routes).forEach(function (key) {
            results[key] = decode(routes[key]);
          });

          that.notify(cb, results);
        });
      }
    },
    add: {
      value: function (path, data, cb) {
        var that  = this;

        runCommand("add", path, encode(data), function(error, stdout, stderr) {
          that.notify(cb);
        });
      }
    },
    update: {
      value: function (path, data, cb) {
        var that  = this;

        runCommand("update", path, encode(data), function(error, stdout, stderr) {
          that.notify(cb);
        });
      }
    },
    remove: {
      value: function (path, cb) {
        var that = this;

        runCommand("remove", path, function(error, stdout, stderr) {
          that.notify(cb);
        });
      }
    },
    hasRoute: {
      value: function (path, cb) {
        var that = this;

        runCommand("exists", path, function(error, stdout, stderr) {
          that.notify(cb, !error);
        });
      }
    }
  });
};
