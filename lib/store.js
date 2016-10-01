var trie = require('./trie.js');

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


exports.MemoryStore = function () {
  return require("./store/memory.js").create(BaseStore);
};

exports.ExternalStore = function (command) {
  return require("./store/external.js").create(BaseStore, command);
};

exports.RedisStore = function (host, port, db) {
  return require("./store/redis.js").create(BaseStore, host, port, db);
};
