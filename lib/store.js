var trie = require("./trie.js");

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

exports.MemoryStore = MemoryStore;
