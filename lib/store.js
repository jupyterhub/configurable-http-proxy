var trie = require("./trie.js");

var NotImplemented = function (name) {
  return {
    name: "NotImplementedException",
    message: "method '" + name + "' not implemented"
  };
};

var BaseStore = Object.create(Object.prototype, {
  // "abstract" methods
  get:       { value: function (path) { throw NotImplemented("get"); } },
  getTarget: { value: function (path) { throw NotImplemented("getTarget"); } },
  getAll:    { value: function (path) { throw NotImplemented("getAll"); } },
  add:       { value: function (path) { throw NotImplemented("add"); } },
  update:    { value: function (path) { throw NotImplemented("update"); } },
  remove:    { value: function (path) { throw NotImplemented("remove"); } },
  hasRoute:  { value: function (path) { throw NotImplemented("hasRoute"); } },

  cleanPath: {
    value: function (path) {
      return trie.trim_prefix(path);
    }
  }
});

function MemoryStore () {
  var routes = {};
  var urls   = new trie.URLTrie()

  return Object.create(BaseStore, {
    get: {
      value: function (path) {
        return routes[path];
      }
    },
    getTarget: {
      value: function (path) {
        return urls.get(path);
      }
    },
    getAll: {
      value: function () {
        return routes;
      }
    },
    add: {
      value: function (path, data) {
        routes[path] = data;
        urls.add(path, data);
      }
    },
    update: {
      value: function (path, data) {
        Object.assign(routes[path], data);
      }
    },
    remove: {
      value: function (path) {
        delete routes[path];
        urls.remove(path);
      }
    },
    hasRoute: {
      value: function (path) {
        return routes.hasOwnProperty(path);
      }
    }
  });
}

exports.MemoryStore = MemoryStore;
