import { RedisStore } from "../lib/store.js";

// These tests need a running Redis. They connect to REDIS_URL (default
// redis://localhost:6379) and self-skip (pending) if none is reachable, so
// `npm test` still passes locally without Redis. CI provides a redis service.
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const TEST_KEY = "test:configurable-http-proxy:routes";

function makeStore() {
  return new RedisStore({ redisUrl: REDIS_URL, redisKeyPrefix: TEST_KEY });
}

describe("RedisStore", function () {
  var redisAvailable = false;

  beforeAll(async function () {
    var probe = makeStore();
    try {
      await probe.ready;
      redisAvailable = true;
    } catch (e) {
      redisAvailable = false;
    } finally {
      try {
        await probe.stop();
      } catch (e) {
        // ignore: connection never established
      }
    }
  });

  beforeEach(async function () {
    if (!redisAvailable) {
      pending("Redis is not available at " + REDIS_URL);
      return;
    }
    this.subject = makeStore();
    await this.subject.ready;
    // start every test from a clean hash
    await this.subject.client.del(TEST_KEY);
  });

  afterEach(async function () {
    if (!this.subject) return;
    // always close the connection, even if cleanup fails, so no client is left
    // dangling between specs (a hanging handle can make the runner exit non-zero)
    try {
      await this.subject.client.del(TEST_KEY);
    } catch (e) {
      // ignore cleanup errors
    }
    try {
      await this.subject.stop();
    } catch (e) {
      // ignore: client may already be closing
    }
  });

  describe("get", function () {
    it("returns the data for the specified path", async function () {
      await this.subject.add("/myRoute", { test: "value" });
      var data = await this.subject.get("/myRoute");
      expect(data).toEqual({ test: "value" });
    });

    it("returns undefined when not found", async function () {
      var result = await this.subject.get("/wut");
      expect(result).toBe(undefined);
    });
  });

  describe("getTarget", function () {
    it("returns the target object for the path", async function () {
      await this.subject.add("/myRoute", { target: "http://localhost:8213" });
      var target = await this.subject.getTarget("/myRoute");
      expect(target.prefix).toEqual("/myRoute");
      expect(target.data.target).toEqual("http://localhost:8213");
    });
  });

  describe("getAll", function () {
    it("returns all routes", async function () {
      await this.subject.add("/myRoute", { test: "value1" });
      await this.subject.add("/myOtherRoute", { test: "value2" });
      var routes = await this.subject.getAll();
      expect(Object.keys(routes).length).toEqual(2);
      expect(routes["/myRoute"]).toEqual({ test: "value1" });
      expect(routes["/myOtherRoute"]).toEqual({ test: "value2" });
    });

    it("returns a blank object when no routes defined", async function () {
      var routes = await this.subject.getAll();
      expect(routes).toEqual({});
    });
  });

  describe("add", function () {
    it("adds data to the store for the specified path", async function () {
      await this.subject.add("/myRoute", { test: "value" });
      var route = await this.subject.get("/myRoute");
      expect(route).toEqual({ test: "value" });
    });

    it("overwrites any existing values", async function () {
      await this.subject.add("/myRoute", { test: "value" });
      await this.subject.add("/myRoute", { test: "updatedValue" });
      var route = await this.subject.get("/myRoute");
      expect(route).toEqual({ test: "updatedValue" });
    });
  });

  describe("update", function () {
    it("merges supplied data with existing data", async function () {
      await this.subject.add("/myRoute", { version: 1, test: "value" });
      await this.subject.update("/myRoute", { version: 2 });
      var route = await this.subject.get("/myRoute");
      expect(route.version).toEqual(2);
      expect(route.test).toEqual("value");
    });
  });

  describe("remove", function () {
    it("removes a route from the table", async function () {
      await this.subject.add("/myRoute", { test: "value" });
      await this.subject.remove("/myRoute");
      var route = await this.subject.get("/myRoute");
      expect(route).toBe(undefined);
    });

    it("doesn't explode when route is not defined", async function () {
      await this.subject.remove("/myRoute/foo/bar");
    });
  });

  describe("persistence across restarts", function () {
    it("hydrates routes written by a previous instance", async function () {
      await this.subject.add("/persisted", { target: "http://localhost:9999" });
      await this.subject.update("/persisted", { last_activity: new Date("2020-01-01T00:00:00Z") });

      // simulate a restart: a brand new store pointed at the same Redis hash
      var revived = makeStore();
      try {
        await revived.ready;
        var route = await revived.get("/persisted");
        expect(route.target).toEqual("http://localhost:9999");
        // last_activity is revived as a Date, not a string
        expect(route.last_activity instanceof Date).toBe(true);
        var target = await revived.getTarget("/persisted/inside/here");
        expect(target.prefix).toEqual("/persisted");
      } finally {
        await revived.stop();
      }
    });
  });
});
