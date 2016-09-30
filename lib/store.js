var trie = require("./trie.js");
var exec = require('child_process').exec;

var NotImplemented = function (name) {
  return {
    name: "NotImplementedException",
    message: "method '" + name + "' not implemented"
  };
};

var BaseStore = Object.create(Object.prototype, {
  // "abstract" methods
  get:       { value: function () { throw NotImplemented("get"); } },
  getTarget: { value: function () { throw NotImplemented("getTarget"); } },
  getAll:    { value: function () { throw NotImplemented("getAll"); } },
  add:       { value: function () { throw NotImplemented("add"); } },
  update:    { value: function () { throw NotImplemented("update"); } },
  remove:    { value: function () { throw NotImplemented("remove"); } },
  hasRoute:  { value: function () { throw NotImplemented("hasRoute"); } },

  cleanPath: {
    value: function (path) {
      return trie.trim_prefix(path);
    }
  },

  notify: {
    value: function (cb) {
      if (typeof(cb) === "function") {
        var args = Array.prototype.slice.call(arguments, 1);
        cb.apply(this, args);
      }
    }
  }
});

function MemoryStore () {
  var routes = {};
  var urls   = new trie.URLTrie();

  return Object.create(BaseStore, {
    get: {
      value: function (path, cb) {
        this.notify(cb, routes[path]);
      }
    },
    getTarget: {
      value: function (path, cb) {
        this.notify(cb, urls.get(path));
      }
    },
    getAll: {
      value: function (cb) {
        this.notify(cb, routes);
      }
    },
    add: {
      value: function (path, data, cb) {
        routes[path] = data;
        urls.add(path, data);
        this.notify(cb);
      }
    },
    update: {
      value: function (path, data, cb) {
        Object.assign(routes[path], data);
        this.notify(cb);
      }
    },
    remove: {
      value: function (path, cb) {
        delete routes[path];
        urls.remove(path);
        this.notify(cb);
      }
    },
    hasRoute: {
      value: function (path, cb) {
        this.notify(cb, routes.hasOwnProperty(path));
      }
    }
  });
}

function ExternalStore (command) {
  var encode = function (value) {
    return new Buffer(JSON.stringify(value)).toString("base64");
  };

  var decode = function (value) {
    return JSON.parse(new Buffer(value, "base64").toString("utf8"));
  };

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
}

exports.MemoryStore   = MemoryStore;
exports.ExternalStore = ExternalStore;
