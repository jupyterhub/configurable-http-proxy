var trie = require("./trie.js");

function MemoryStore () {
  var routes = {};
  var urls   = new trie.URLTrie()

  return {
    get: function (path) { return routes[path]; },
    getTarget: function(path) { return urls.get(path); },
    getAll: function () { return routes; },
    cleanPath: function(path) { return trie.trim_prefix(path); },
    add: function (path, data) {
      routes[path] = data;
      urls.add(path, data);
    },
    update: function(path, data) { Object.assign(routes[path], data) },
    remove: function (path) {
      delete routes[path];
      urls.remove(path);
    },
    hasRoute: function (path) { return routes.hasOwnProperty(path); }
  };
}

exports.MemoryStore = MemoryStore;
