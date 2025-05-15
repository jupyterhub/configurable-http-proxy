class PlugableDummyStore {
  get(path) {}
  getTarget(path) {}
  getAll() {}
  add(path, data) {}
  update(path, data) {}
  remove(path) {}
}

module.exports = PlugableDummyStore;
