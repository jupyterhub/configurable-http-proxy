// jshint jasmine: true
"use strict";

var path = require("path");
var util = require("../lib/testutil");
var request = require("request-promise-native");
var WebSocket = require("ws");

var ConfigurableProxy = require("../lib/configproxy").ConfigurableProxy;

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

describe("Proxy Tests", function () {
  var port = 8902;
  var testPort = port + 10;
  var proxy;
  var proxyUrl = "http://127.0.0.1:" + port;
  var hostTest = "test.localhost.jovyan.org";
  var hostUrl = "http://" + hostTest + ":" + port;

  var r = request.defaults({
    method: "GET",
    url: proxyUrl,
    followRedirect: false,
  });

  beforeEach(function (callback) {
    util.setupProxy(port).then(function (newProxy) {
      proxy = newProxy;
      callback();
    });
  });

  afterEach(function (callback) {
    util.teardownServers(callback);
  });

  it("basic HTTP request", function (done) {
    r(proxyUrl).then((body) => {
      body = JSON.parse(body);
      expect(body).toEqual(
        jasmine.objectContaining({
          path: "/",
        })
      );

      // check last_activity was updated
      return proxy._routes.get("/").then((route) => {
        expect(route.last_activity).toBeGreaterThan(proxy._setup_timestamp);
        done();
      });
    });
  });

  it("basic WebSocket request", function (done) {
    var ws = new WebSocket("ws://127.0.0.1:" + port);
    ws.on("error", function () {
      // jasmine fail is only in master
      expect("error").toEqual("ok");
      done();
    });
    var nmsgs = 0;
    ws.on("message", function (msg) {
      if (nmsgs === 0) {
        expect(msg).toEqual("connected");
      } else {
        msg = JSON.parse(msg);
        expect(msg).toEqual(
          jasmine.objectContaining({
            path: "/",
            message: "hi",
          })
        );
        // check last_activity was updated
        return proxy._routes.get("/").then((route) => {
          expect(route.last_activity).toBeGreaterThan(proxy._setup_timestamp);
          ws.close();
          done();
        });
      }
      nmsgs++;
    });
    ws.on("open", function () {
      ws.send("hi");
    });
  });

  it("proxyRequest event can modify headers", function (done) {
    var called = {};
    proxy.on("proxyRequest", function (req, res) {
      req.headers.testing = "Test Passed";
      called.proxyRequest = true;
    });

    r(proxyUrl)
      .then(function (body) {
        body = JSON.parse(body);
        expect(called.proxyRequest).toBe(true);
        expect(body).toEqual(
          jasmine.objectContaining({
            path: "/",
          })
        );
        expect(body.headers).toEqual(
          jasmine.objectContaining({
            testing: "Test Passed",
          })
        );
      })
      .then(done);
  });

  it("target path is prepended by default", function (done) {
    util
      .addTarget(proxy, "/bar", testPort, false, "/foo")
      .then(() => r(proxyUrl + "/bar/rest/of/it"))
      .then((body) => {
        body = JSON.parse(body);
        expect(body).toEqual(
          jasmine.objectContaining({
            path: "/bar",
            url: "/foo/bar/rest/of/it",
          })
        );
        done();
      });
  });

  it("/prefix?query is proxied correctly", function (done) {
    util
      .addTarget(proxy, "/bar", testPort, null, "/foo")
      .then(() => r(proxyUrl + "/bar?query=foo"))
      .then((body) => {
        body = JSON.parse(body);
        expect(body).toEqual(
          jasmine.objectContaining({
            target: "http://127.0.0.1:" + testPort + "/foo",
            path: "/bar",
            url: "/foo/bar?query=foo",
          })
        );
        done();
      });
  });

  it("handle URI encoding", function (done) {
    util
      .addTarget(proxy, "/b@r/b r", testPort, false, "/foo")
      .then(() => r(proxyUrl + "/b%40r/b%20r/rest/of/it"))
      .then((body) => {
        body = JSON.parse(body);
        expect(body).toEqual(
          jasmine.objectContaining({
            path: "/b@r/b r",
            url: "/foo/b%40r/b%20r/rest/of/it",
          })
        );
        done();
      });
  });

  it("handle @ in URI same as %40", function (done) {
    util
      .addTarget(proxy, "/b@r/b r", testPort, false, "/foo")
      .then(() => r(proxyUrl + "/b@r/b%20r/rest/of/it"))
      .then((body) => {
        body = JSON.parse(body);
        expect(body).toEqual(
          jasmine.objectContaining({
            path: "/b@r/b r",
            url: "/foo/b@r/b%20r/rest/of/it",
          })
        );
        done();
      });
  });

  it("prependPath: false prevents target path from being prepended", function (done) {
    proxy.proxy.options.prependPath = false;
    util
      .addTarget(proxy, "/bar", testPort, false, "/foo")
      .then(() => r(proxyUrl + "/bar/rest/of/it"))
      .then((body) => {
        body = JSON.parse(body);
        expect(body).toEqual(
          jasmine.objectContaining({
            path: "/bar",
            url: "/bar/rest/of/it",
          })
        );
        done();
      });
  });

  it("includePrefix: false strips routing prefix from request", function (done) {
    proxy.includePrefix = false;
    util
      .addTarget(proxy, "/bar", testPort, false, "/foo")
      .then(() => r(proxyUrl + "/bar/rest/of/it"))
      .then((body) => {
        body = JSON.parse(body);
        expect(body).toEqual(
          jasmine.objectContaining({
            path: "/bar",
            url: "/foo/rest/of/it",
          })
        );
        done();
      });
  });

  it("options.defaultTarget", function (done) {
    var options = {
      defaultTarget: "http://127.0.0.1:9001",
    };

    var cp = new ConfigurableProxy(options);
    cp._routes.get("/").then(function (route) {
      expect(route.target).toEqual("http://127.0.0.1:9001");
      done();
    });
  });

  it("options.storageBackend", function (done) {
    const options = {
      storageBackend: "mybackend",
    };
    expect(() => {
      const cp = new ConfigurableProxy(options);
    }).toThrowMatching(function (e) {
      return e.message.includes("Cannot find module 'mybackend'");
    });
    done();
  });

  it("options.storageBackend with an user-defined backend", function (done) {
    const store = path.resolve(__dirname, "dummy-store.js");
    const options = {
      storageBackend: store,
    };
    const cp = new ConfigurableProxy(options);
    expect(cp._routes.constructor.name).toEqual("PlugableDummyStore");
    done();
  });

  it("includePrefix: false + prependPath: false", function (done) {
    proxy.includePrefix = false;
    proxy.proxy.options.prependPath = false;
    util
      .addTarget(proxy, "/bar", testPort, false, "/foo")
      .then(() => r(proxyUrl + "/bar/rest/of/it"))
      .then((body) => {
        body = JSON.parse(body);
        expect(body).toEqual(
          jasmine.objectContaining({
            path: "/bar",
            url: "/rest/of/it",
          })
        );
        done();
      });
  });

  it("hostRouting: routes by host", function (done) {
    proxy.hostRouting = true;
    util
      .addTarget(proxy, "/" + hostTest, testPort, false, null)
      .then(() => r(hostUrl + "/some/path"))
      .then((body) => {
        body = JSON.parse(body);
        expect(body).toEqual(
          jasmine.objectContaining({
            target: "http://127.0.0.1:" + testPort,
            url: "/some/path",
          })
        );
      })
      .then(done);
  });

  it("last_activity not updated on errors", function (done) {
    let now = new Date();
    // mock timestamp in the past
    let firstActivity = new Date(now.getTime() - 60000);

    function expectNoActivity() {
      return proxy._routes.get("/missing", (route) => {
        expect(route.last_activity).toEqual(proxy._setup_timestamp);
      });
    }

    proxy
      .removeRoute("/")
      // add a route to nowhere
      .then(() => proxy.addRoute("/missing", { target: "https://127.0.0.1:54321" }))
      .then(() => {
        // set last_activity into the past
        proxy._routes.update("/missing", { last_activity: firstActivity });
      })
      // fail a web request
      .then(() => r(hostUrl + "/missing/prefix"))
      .then((body) => done.fail("Expected 503"))
      .catch((err) => {
        expect(err.statusCode).toEqual(503);
      })
      // check that activity was not updated
      .then(expectNoActivity)
      // fail a websocket request
      .then(() => {
        var ws = new WebSocket("ws://127.0.0.1:" + port + "/missing/ws");
        ws.on("error", () => {
          // expect this, since there is no websocket handler
          // check last_activity was not updated
          expectNoActivity().then((route) => {
            ws.close();
            done();
          });
        });
        ws.on("open", () => {
          done.fail("Expected websocket error");
        });
      });
  });

  it("custom error target", function (done) {
    var proxyPort = 55550;
    util
      .setupProxy(proxyPort, { errorTarget: "http://127.0.0.1:55565" }, [])
      .then(() => r("http://127.0.0.1:" + proxyPort + "/foo/bar"))
      .then((body) => done.fail("Expected 404"))
      .catch((err) => {
        expect(err.statusCode).toEqual(404);
        expect(err.response.headers["content-type"]).toEqual("text/plain");
        expect(err.response.body).toEqual("/foo/bar");
      })
      .then(done);
  });

  it("custom error path", function (done) {
    proxy.errorPath = path.join(__dirname, "error");
    proxy
      .removeRoute("/")
      .then(() => proxy.addRoute("/missing", { target: "https://127.0.0.1:54321" }))
      .then(() => r(hostUrl + "/nope"))
      .then((body) => done.fail("Expected 404"))
      .catch((err) => {
        expect(err.statusCode).toEqual(404);
        expect(err.response.headers["content-type"]).toEqual("text/html");
        expect(err.response.body).toMatch(/404'D/);
      })
      .then(() => r(hostUrl + "/missing/prefix"))
      .then((body) => done.fail("Expected 503"))
      .catch((err) => {
        expect(err.statusCode).toEqual(503);
        expect(err.response.headers["content-type"]).toEqual("text/html");
        expect(err.response.body).toMatch(/UNKNOWN/);
      })
      .then(done);
  });

  it("default error html", function (done) {
    proxy.removeRoute("/");
    proxy
      .addRoute("/missing", { target: "https://127.0.0.1:54321" })
      .then(() => r(hostUrl + "/nope"))
      .then((body) => done.fail("Expected 404"))
      .catch((err) => {
        expect(err.statusCode).toEqual(404);
        expect(err.response.headers["content-type"]).toEqual("text/html");
        expect(err.response.body).toMatch(/404:/);
      })
      .then(() => r(hostUrl + "/missing/prefix"))
      .then((body) => done.fail("Expected 503"))
      .catch((err) => {
        expect(err.statusCode).toEqual(503);
        expect(err.response.headers["content-type"]).toEqual("text/html");
        expect(err.response.body).toMatch(/503:/);
      })
      .then(done);
  });

  it("Redirect location untouched without rewrite options", function (done) {
    var redirectTo = "http://foo.com:12345/whatever";
    util
      .addTargetRedirecting(proxy, "/external/urlpath/", testPort, "/internal/urlpath/", redirectTo)
      .then(() => r(proxyUrl + "/external/urlpath/rest/of/it"))
      .then((body) => done.fail("Expected 301"))
      .catch((err) => {
        expect(err.statusCode).toEqual(301);
        expect(err.response.headers.location).toEqual(redirectTo);
      })
      .then(done);
  });

  it("Redirect location with rewriting", function (done) {
    var proxyPort = 55556;
    var options = {
      protocolRewrite: "https",
      autoRewrite: true,
    };

    // where the backend server redirects us.
    // Note that http-proxy requires (logically) the redirection to be to the same (internal) host.
    var redirectTo = "https://127.0.0.1:" + testPort + "/whatever";
    var expectedRedirect = "https://127.0.0.1:" + proxyPort + "/whatever";

    util
      .setupProxy(proxyPort, options, [])
      .then((proxy) =>
        util.addTargetRedirecting(
          proxy,
          "/external/urlpath/",
          testPort,
          "/internal/urlpath/",
          redirectTo
        )
      )
      .then(() => r("http://127.0.0.1:" + proxyPort + "/external/urlpath/"))
      .then((body) => done.fail("Expected 301"))
      .catch((err) => {
        expect(err.statusCode).toEqual(301);
        expect(err.response.headers.location).toEqual(expectedRedirect);
      })
      .then(done);
  });

  it("health check request", function (done) {
    r(proxyUrl + "/_chp_healthz").then((body) => {
      body = JSON.parse(body);
      expect(body).toEqual({ status: "OK" });
      done();
    });
  });

  it("metrics request", function (done) {
    r(proxyUrl + "/metrics").then((body) => {
      expect(body).toContain("process_cpu_user_seconds_total");
      done();
    });
  });
});
