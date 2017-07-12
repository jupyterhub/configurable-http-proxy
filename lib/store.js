var trie = require("./trie.js");

var NotImplemented = function (name) {
  return {
    name: "NotImplementedException",
    message: "method '" + name + "' not implemented"
  };
};

var BaseStore = Object.create(Object.prototype, {
  // "abstract" methods
  getTarget: { value: function () { throw NotImplemented("getTarget"); } },
  getAll:    { value: function () { throw NotImplemented("getAll"); } },
  add:       { value: function () { throw NotImplemented("add"); } },
  update:    { value: function () { throw NotImplemented("update"); } },
  remove:    { value: function () { throw NotImplemented("remove"); } },

  get: {
    // default get implementation derived from getAll
    // only needs overriding if a more efficient implementation is available
    value: function (path) {
      path = this.cleanPath(path);
      return this.getAll().then((routes) => routes[path]);
    },
  },

  cleanPath: {
    value: function (path) {
      return trie.trim_prefix(path);
    }
  },
});

function MemoryStore () {
  var routes = {};
  var urls   = new trie.URLTrie();

  return Object.create(BaseStore, {
    get: {
      value: function (path) {
        return Promise.resolve(routes[this.cleanPath(path)]);
      }
    },
    getTarget: {
      value: function (path) {
        return Promise.resolve(urls.get(path));
      }
    },
    getAll: {
      value: function () {
        return Promise.resolve(routes);
      }
    },
    add: {
      value: function (path, data) {
        path = this.cleanPath(path);
        routes[path] = data;
        urls.add(path, data);
        return Promise.resolve(null);
      }
    },
    update: {
      value: function (path, data, cb) {
        Object.assign(routes[this.cleanPath(path)], data);
      }
    },
    remove: {
      value: function (path, cb) {
        path = this.cleanPath(path);
        var route = routes[path];
        delete routes[path];
        urls.remove(path);
        return Promise.resolve(route);
      }
    },
  });
}

exports.MemoryStore = MemoryStore;
