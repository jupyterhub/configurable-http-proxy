import * as util from "../lib/testutil.js";

import log from "winston";
import fetch from "node-fetch";

// disable logging during tests
log.remove(log.transports.Console);

describe("API Tests", function () {
  var port = 8902;
  var listenOptions = {
    port: port,
    apiPort: 8903,
    ip: '127.0.0.1'
  };
  var proxy;
  var apiUrl = "http://" + listenOptions.ip + ":" + listenOptions.apiPort + "/api/routes";

  var r;

  beforeEach(function (callback) {
    util
      .setupProxy(listenOptions)
      .then(function (newProxy) {
        proxy = newProxy;
      })
      .then(function () {
        r = (path, options) => {
          options = options || {};
          path = path || "";
          const url = `${options.url || apiUrl}${path}`;
          delete options.url;
          const fetchOptions = {
            method: "GET",
            headers: {
              Authorization: `token ${proxy.authToken}`,
            },
            ...options,
          };
          return fetch(url, fetchOptions);
        };
      })
      .then(function () {
        callback();
      });
  });

  afterEach(function (callback) {
    util.teardownServers(callback);
  });

  it("Basic proxy constructor", function () {
    expect(proxy).toBeDefined();
    expect(proxy.defaultTarget).toBe(undefined);

    return proxy.targetForReq({ url: "/" }).then(function (route) {
      expect(route).toEqual({
        prefix: "/",
        target: "http://127.0.0.1:" + (port + 2),
      });
    });
  });

  it("Default target is used for /any/random/url", function (done) {
    proxy.targetForReq({ url: "/any/random/url" }).then(function (target) {
      expect(target).toEqual({
        prefix: "/",
        target: "http://127.0.0.1:" + (port + 2),
      });

      done();
    });
  });

  it("Default target is used for /", function (done) {
    proxy.targetForReq({ url: "/" }).then(function (target) {
      expect(target).toEqual({
        prefix: "/",
        target: "http://127.0.0.1:" + (port + 2),
      });

      done();
    });
  });

  it("GET /api/routes fetches the routing table", function (done) {
    r()
      .then((res) => res.json())
      .then(function (reply) {
        var keys = Object.keys(reply);
        expect(keys.length).toEqual(1);
        expect(keys).toContain("/");
      })
      .then(done);
  });

  it("GET /api/routes[/path] fetches a single route", function (done) {
    var path = "/path";
    var url = "https://127.0.0.1:54321";
    proxy
      .addRoute(path, { target: url })
      .then(function () {
        return r(path);
      })
      .then((res) => res.json())
      .then(function (reply) {
        var keys = Object.keys(reply);
        expect(keys).toContain("target");
        expect(reply.target).toEqual(url);
      })
      .catch(done.fail)
      .then(done);
  });

  it("GET /api/routes[/path] fetches a single route (404 if missing)", function (done) {
    r("/path")
      .then((res) => {
        expect(res.status).toEqual(404);
      })
      .then(done);
  });

  it("POST /api/routes[/path] creates a new route", function (done) {
    var port = 8998;
    var target = "http://127.0.0.1:" + port;

    r("/user/foo", {
      method: "POST",
      body: JSON.stringify({ target: target }),
    })
      .then((res) => res.text())
      .then((body) => {
        expect(body).toEqual("");
      })
      .then(() => proxy._routes.get("/user/foo"))
      .then((route) => {
        expect(route.target).toEqual(target);
        expect(typeof route.last_activity).toEqual("object");
      })
      .catch(done.fail)
      .then(done);
  });

  it("POST /api/routes[/foo%20bar] handles URI escapes", function (done) {
    var port = 8998;
    var target = "http://127.0.0.1:" + port;
    r("/user/foo%40bar", {
      method: "POST",
      body: JSON.stringify({ target: target }),
    })
      .then((res) => res.text())
      .then((body) => {
        expect(body).toEqual("");
      })
      .then(() => proxy._routes.get("/user/foo@bar"))
      .then((route) => {
        expect(route.target).toEqual(target);
        expect(typeof route.last_activity).toEqual("object");
      })
      .then(() => proxy.targetForReq({ url: "/user/foo@bar/path" }))
      .then((proxyTarget) => {
        expect(proxyTarget.target).toEqual(target);
      })
      .then(done);
  });

  it("POST /api/routes creates a new root route", function (done) {
    var port = 8998;
    var target = "http://127.0.0.1:" + port;
    r("", {
      method: "POST",
      body: JSON.stringify({ target: target }),
    })
      .then((res) => res.text())
      .then((body) => {
        expect(body).toEqual("");
        return proxy._routes.get("/");
      })
      .then((route) => {
        expect(route.target).toEqual(target);
        expect(typeof route.last_activity).toEqual("object");
        done();
      });
  });

  it("DELETE /api/routes[/path] deletes a route", function (done) {
    var port = 8998;
    var target = "http://127.0.0.1:" + port;
    var path = "/user/bar";

    util
      .addTarget(proxy, path, port, null, null)
      .then(() => proxy._routes.get(path))
      .then((route) => expect(route.target).toEqual(target))
      .then(() => r(path, { url: apiUrl, method: "DELETE" }))
      .then((res) => res.text())
      .then((body) => expect(body).toEqual(""))
      .then(() => proxy._routes.get(path))
      .then((deletedRoute) => expect(deletedRoute).toBe(undefined))
      .then(done);
  });

  it("GET /api/routes?inactiveSince= with bad value returns a 400", function (done) {
    r("?inactiveSince=endoftheuniverse")
      .then((res) => expect(res.status).toEqual(400))
      .then(done);
  });

  it("GET /api/routes?inactiveSince= filters inactive entries", function (done) {
    var port = 8998;
    var path = "/yesterday";

    var now = new Date();
    var yesterday = new Date(now.getTime() - 24 * 3.6e6);
    var longAgo = new Date(1);
    var hourAgo = new Date(now.getTime() - 3.6e6);
    var hourFromNow = new Date(now.getTime() + 3.6e6);

    var tests = [
      {
        name: "long ago",
        since: longAgo,
        expected: {},
      },
      {
        name: "an hour ago",
        since: hourAgo,
        expected: { "/yesterday": true },
      },
      {
        name: "the future",
        since: hourFromNow,
        expected: {
          "/yesterday": true,
          "/today": true,
        },
      },
    ];

    var seen = 0;
    var doReq = function (i) {
      var t = tests[i];
      return r("?inactiveSince=" + t.since.toISOString())
        .then((res) => res.json())
        .then(function (routes) {
          var routeKeys = Object.keys(routes);
          var expectedKeys = Object.keys(t.expected);

          routeKeys.forEach(function (key) {
            // check that all routes are expected
            expect(expectedKeys).toContain(key);
          });

          expectedKeys.forEach(function (key) {
            // check that all expected routes are found
            expect(routeKeys).toContain(key);
          });

          seen += 1;
          if (seen === tests.length) {
            done();
          } else {
            return doReq(seen);
          }
        });
    };

    proxy
      .removeRoute("/")
      .then(() => util.addTarget(proxy, "/yesterday", port, null, null))
      .then(() => util.addTarget(proxy, "/today", port + 1, null, null))
      .then(() => proxy._routes.update("/yesterday", { last_activity: yesterday }))
      .then(() => doReq(0))
      .then();
  });
});
