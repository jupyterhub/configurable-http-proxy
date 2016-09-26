function MemoryStore () {
  var routes = {};

  return {
    get: function (path) { return routes[path]; },
    getAll: function () { return routes; },
    add: function (path, data) { routes[path] = data; },
    update: function(path, data) { Object.assign(routes[path], data) },
    remove: function (path) { delete routes[path]; },
    hasRoute: function (path) { return routes.hasOwnProperty(path); }
  };
}

exports.MemoryStore = MemoryStore;
