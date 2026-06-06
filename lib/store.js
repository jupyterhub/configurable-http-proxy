"use strict";

import * as trie from "./trie.js";
import { createClient } from "redis";

var NotImplemented = function (name) {
  return {
    name: "NotImplementedException",
    message: "method '" + name + "' not implemented",
  };
};

export class BaseStore {
  // "abstract" methods
  getTarget(path) {
    throw NotImplemented("getTarget");
  }
  getAll() {
    throw NotImplemented("getAll");
  }
  add(path, data) {
    throw NotImplemented("add");
  }
  update(path, data) {
    throw NotImplemented("update");
  }
  remove(path) {
    throw NotImplemented("remove");
  }

  get(path) {
    // default get implementation derived from getAll
    // only needs overriding if a more efficient implementation is available
    path = this.cleanPath(path);
    return this.getAll().then((routes) => routes[path]);
  }

  cleanPath(path) {
    return trie.trimPrefix(path);
  }
}

export class MemoryStore extends BaseStore {
  constructor() {
    super();
    this.routes = {};
    this.urls = new trie.URLTrie();
  }

  get(path) {
    return Promise.resolve(this.routes[this.cleanPath(path)]);
  }

  getTarget(path) {
    return Promise.resolve(this.urls.get(path));
  }

  getAll() {
    return Promise.resolve(this.routes);
  }

  add(path, data) {
    path = this.cleanPath(path);
    this.routes[path] = data;
    this.urls.add(path, data);
    return Promise.resolve(null);
  }

  update(path, data) {
    Object.assign(this.routes[this.cleanPath(path)], data);
  }

  remove(path) {
    path = this.cleanPath(path);
    var route = this.routes[path];
    delete this.routes[path];
    this.urls.remove(path);
    return Promise.resolve(route);
  }
}

// RedisStore is a MemoryStore that mirrors every write to a Redis hash and
// hydrates itself from that hash on startup. Reads (get/getAll/getTarget) are
// served entirely from memory (the inherited URLTrie), so the proxy hot path is
// unchanged; Redis only adds persistence so routes survive a process restart.
export class RedisStore extends MemoryStore {
  constructor(options = {}) {
    super();
    this.log = options.log;
    if (!options.redisUrl) {
      throw new Error("RedisStore requires a redis url (set REDIS_URL or options.redisUrl)");
    }
    // a single hash keyed by route path, values are JSON-encoded route data
    this.key = options.redisKeyPrefix || "configurable-http-proxy:routes";
    this.client = createClient({
      url: options.redisUrl,
      socket: {
        // keep retrying forever with a capped backoff; a Redis blip should
        // never take the proxy down, only pause persistence of new writes
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
      },
    });
    this.client.on("error", (err) => {
      if (this.log) this.log.error("Redis store error: %s", err.message);
    });
    // expose readiness so writes wait for the connection + initial hydration
    this.ready = this.client.connect().then(() => this._hydrate());
    this.ready.catch((err) => {
      if (this.log) this.log.error("Redis store failed to initialize: %s", err.message);
    });
  }

  async _hydrate() {
    // load the persisted routing table into the in-memory store + trie
    var stored = await this.client.hGetAll(this.key);
    Object.keys(stored).forEach((path) => {
      // super.add (not this.add) so hydration doesn't write back to Redis
      super.add(path, this._deserialize(stored[path]));
    });
    if (this.log) {
      this.log.info("Loaded %d routes from Redis", Object.keys(stored).length);
    }
  }

  _serialize(data) {
    return JSON.stringify(data);
  }

  _deserialize(json) {
    var data = JSON.parse(json);
    // MemoryStore stores last_activity as a Date; revive it so the
    // inactiveSince comparison in getRoutes keeps working after a reload
    if (data && data.last_activity) {
      data.last_activity = new Date(data.last_activity);
    }
    return data;
  }

  async add(path, data) {
    super.add(path, data); // update memory + trie immediately
    await this.ready;
    await this.client.hSet(this.key, this.cleanPath(path), this._serialize(data));
    return null;
  }

  async update(path, data) {
    super.update(path, data); // merge in memory
    await this.ready;
    var merged = this.routes[this.cleanPath(path)];
    if (merged) {
      await this.client.hSet(this.key, this.cleanPath(path), this._serialize(merged));
    }
  }

  async remove(path) {
    var route = await super.remove(path); // remove from memory + trie
    await this.ready;
    await this.client.hDel(this.key, this.cleanPath(path));
    return route;
  }

  stop() {
    // close the connection (used by tests; safe to call when never connected)
    return this.client.quit();
  }
}
