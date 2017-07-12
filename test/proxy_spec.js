// jshint jasmine: true
"use strict";

var path = require("path");
var util = require("../lib/testutil");
var request = require("request-promise-native");
var WebSocket = require("ws");

var ConfigurableProxy = require("../lib/configproxy").ConfigurableProxy;

describe("Proxy Tests", function() {
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

  beforeEach(function(callback) {
    util.setupProxy(port).then(function(newProxy) {
      proxy = newProxy;
      callback();
    });
  });

  afterEach(function(callback) {
    util.teardownServers(callback);
  });

  it("basic HTTP request", function(done) {
    r(proxyUrl).then(body => {
      body = JSON.parse(body);
      expect(body).toEqual(
        jasmine.objectContaining({
          path: "/",
        })
      );
      done();
    });
  });

  it("basic WebSocker request", function(done) {
    var ws = new WebSocket("ws://127.0.0.1:" + port);
    ws.on("error", function() {
      // jasmine fail is only in master
      expect("error").toEqual("ok");
      done();
    });
    var nmsgs = 0;
    ws.on("message", function(msg) {
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
        ws.close();
        done();
      }
      nmsgs++;
    });
    ws.on("open", function() {
      ws.send("hi");
    });
  });

  it("proxyRequest event can modify headers", function(done) {
    var called = {};
    proxy.on("proxyRequest", function(req, res) {
      req.headers.testing = "Test Passed";
      called.proxyRequest = true;
    });

    r(proxyUrl)
      .then(function(body) {
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

  it("target path is prepended by default", function(done) {
    util
      .addTarget(proxy, "/bar", testPort, false, "/foo")
      .then(() => r(proxyUrl + "/bar/rest/of/it"))
      .then(body => {
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

  it("handle URI encoding", function(done) {
    util
      .addTarget(proxy, "/b@r/b r", testPort, false, "/foo")
      .then(() => r(proxyUrl + "/b%40r/b%20r/rest/of/it"))
      .then(body => {
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

  it("handle @ in URI same as %40", function(done) {
    util
      .addTarget(proxy, "/b@r/b r", testPort, false, "/foo")
      .then(() => r(proxyUrl + "/b@r/b%20r/rest/of/it"))
      .then(body => {
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

  it("prependPath: false prevents target path from being prepended", function(
    done
  ) {
    proxy.proxy.options.prependPath = false;
    util
      .addTarget(proxy, "/bar", testPort, false, "/foo")
      .then(() => r(proxyUrl + "/bar/rest/of/it"))
      .then(body => {
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

  it("includePrefix: false strips routing prefix from request", function(done) {
    proxy.includePrefix = false;
    util
      .addTarget(proxy, "/bar", testPort, false, "/foo")
      .then(() => r(proxyUrl + "/bar/rest/of/it"))
      .then(body => {
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

  it("options.defaultTarget", function(done) {
    var options = {
      defaultTarget: "http://127.0.0.1:9001",
    };

    var cp = new ConfigurableProxy(options);
    cp._routes.get("/").then(function(route) {
      expect(route.target).toEqual("http://127.0.0.1:9001");
      done();
    });
  });

  it("includePrefix: false + prependPath: false", function(done) {
    proxy.includePrefix = false;
    proxy.proxy.options.prependPath = false;
    util
      .addTarget(proxy, "/bar", testPort, false, "/foo")
      .then(() => r(proxyUrl + "/bar/rest/of/it"))
      .then(body => {
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

  it("hostRouting: routes by host", function(done) {
    proxy.hostRouting = true;
    util
      .addTarget(proxy, "/" + hostTest, testPort, false, null)
      .then(() => r(hostUrl + "/some/path"))
      .then(body => {
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

  it("custom error target", function(done) {
    var port = 55555;
    util
      .setupProxy(port, { errorTarget: "http://127.0.0.1:55565" }, [])
      .then(() => r("http://127.0.0.1:" + port + "/foo/bar"))
      .then(body => done.fail("Expected 404"))
      .catch(err => {
        expect(err.statusCode).toEqual(404);
        expect(err.response.headers["content-type"]).toEqual("text/plain");
        expect(err.response.body).toEqual("/foo/bar");
      })
      .then(done);
  });

  it("custom error path", function(done) {
    proxy.errorPath = path.join(__dirname, "error");
    proxy
      .removeRoute("/")
      .then(() =>
        proxy.addRoute("/missing", { target: "https://127.0.0.1:54321" })
      )
      .then(() => r(hostUrl + "/nope"))
      .then(body => done.fail("Expected 404"))
      .catch(err => {
        expect(err.statusCode).toEqual(404);
        expect(err.response.headers["content-type"]).toEqual("text/html");
        expect(err.response.body).toMatch(/404'D/);
      })
      .then(() => r(hostUrl + "/missing/prefix"))
      .then(body => done.fail("Expected 503"))
      .catch(err => {
        expect(err.statusCode).toEqual(503);
        expect(err.response.headers["content-type"]).toEqual("text/html");
        expect(err.response.body).toMatch(/UNKNOWN/);
      })
      .then(done);
  });

  it("default error html", function(done) {
    proxy.removeRoute("/");
    proxy
      .addRoute("/missing", { target: "https://127.0.0.1:54321" })
      .then(() => r(hostUrl + "/nope"))
      .then(body => done.fail("Expected 404"))
      .catch(err => {
        expect(err.statusCode).toEqual(404);
        expect(err.response.headers["content-type"]).toEqual("text/html");
        expect(err.response.body).toMatch(/404:/);
      })
      .then(() => r(hostUrl + "/missing/prefix"))
      .then(body => done.fail("Expected 503"))
      .catch(err => {
        expect(err.statusCode).toEqual(503);
        expect(err.response.headers["content-type"]).toEqual("text/html");
        expect(err.response.body).toMatch(/503:/);
      })
      .then(done);
  });

  it("Redirect location untouched without rewrite options", function(done) {
    var redirectTo = "http://foo.com:12345/whatever";
    util
      .addTargetRedirecting(
        proxy,
        "/external/urlpath/",
        testPort,
        "/internal/urlpath/",
        redirectTo
      )
      .then(() => r(proxyUrl + "/external/urlpath/rest/of/it"))
      .then(body => done.fail("Expected 301"))
      .catch(err => {
        expect(err.statusCode).toEqual(301);
        expect(err.response.headers.location).toEqual(redirectTo);
      })
      .then(done);
  });

  it("Redirect location with rewriting", function(done) {
    var proxyPort = 55555;
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
      .then(proxy =>
        util.addTargetRedirecting(
          proxy,
          "/external/urlpath/",
          testPort,
          "/internal/urlpath/",
          redirectTo
        )
      )
      .then(() => r("http://127.0.0.1:" + proxyPort + "/external/urlpath/"))
      .then(body => done.fail("Expected 301"))
      .catch(err => {
        expect(err.statusCode).toEqual(301);
        expect(err.response.headers.location).toEqual(expectedRedirect);
      })
      .then(done);
  });
});
