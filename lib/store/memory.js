var trie = require("../trie.js");

exports.create = function (BaseStore) {
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
};
