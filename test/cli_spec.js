// jshint jasmine: true
"use strict";

const http = require("http");
var spawn = require("child_process").spawn;
var request = require("request-promise-native");

// utility functions
function executeCLI(execCmd = "bin/configurable-http-proxy", args = []) {
  var defaultRouteRequested = args.includes("--default-target");
  var redirectRequested = args.includes("--redirect-port");
  var defaultRouteAdded = false;
  var redirectAdded = false;
  var cliProcess = spawn(execCmd, args);
  // uncomment the below line for debugging of tests
  //cliProcess.stdout.pipe(process.stdout);
  const cliReady = new Promise((resolve, reject) => {
    var promiseResolved = false;
    cliProcess.stdout.on("data", (data) => {
      if (data.includes("Route added /")) {
        defaultRouteAdded = true;
      }
      if (data.includes("Added HTTP to HTTPS redirection")) {
        redirectAdded = true;
      }
      if (
        !promiseResolved &&
        defaultRouteAdded === defaultRouteRequested &&
        redirectAdded === redirectRequested
      ) {
        promiseResolved = true;
        resolve(cliProcess);
      }
    });
  });
  return cliReady;
}

var servers = [];

function addServer(name, port) {
  var server = http.createServer(function (req, res) {
    var reply = {};
    reply.url = req.url;
    reply.headers = req.headers;
    reply.name = name;
    res.write(JSON.stringify(reply));
    res.end();
  });
  var serverListening = new Promise((resolve) => {
    server.listen(port, resolve);
    servers.push(server);
  });
  return serverListening;
}

function teardownServers() {
  var count = 0;
  var onclose = function () {
    count = count + 1;
    if (count === servers.length) {
      servers = [];
      return;
    }
  };
  for (var i = servers.length - 1; i >= 0; i--) {
    servers[i].close(onclose);
  }
}

describe("CLI Tests", function () {
  var execCmd = "bin/configurable-http-proxy";
  var port = 8902;
  var apiPort = port + 1;
  var testPort = port + 10;
  var redirectPort = testPort + 1;
  var redirectToPort = redirectPort + 1;
  var childProcess;
  var proxyUrl = "http://127.0.0.1:" + port;
  var SSLproxyUrl = "https://127.0.0.1:" + port;
  var testUrl = "http://127.0.0.1:" + testPort;
  var redirectUrl = "http://127.0.0.1:" + redirectPort;
  var redirectToUrl = "https://127.0.0.1:" + redirectToPort;

  var r = request.defaults({
    method: "GET",
    //url: proxyUrl,
    followRedirect: false,
    strictSSL: false,
  });

  beforeEach(function (callback) {
    addServer("default", testPort).then(callback);
  });

  afterEach(function (callback) {
    teardownServers();
    childProcess.on("exit", () => {
      callback();
    });
    childProcess.kill();
  });

  it("basic HTTP request", function (done) {
    var args = ["--ip", "127.0.0.1", "--port", port, "--default-target", testUrl];
    executeCLI(execCmd, args).then((cliProcess) => {
      childProcess = cliProcess;
      r(proxyUrl).then((body) => {
        body = JSON.parse(body);
        expect(body).toEqual(
          jasmine.objectContaining({
            name: "default",
          })
        );
        done();
      });
    });
  });

  it("basic HTTPS request", function (done) {
    var args = [
      "--ip",
      "127.0.0.1",
      "--ssl-cert",
      "test/server.crt",
      "--ssl-key",
      "test/server.key",
      "--port",
      port,
      "--default-target",
      testUrl,
    ];
    executeCLI(execCmd, args).then((cliProcess) => {
      childProcess = cliProcess;
      r(SSLproxyUrl).then((body) => {
        body = JSON.parse(body);
        expect(body).toEqual(
          jasmine.objectContaining({
            name: "default",
          })
        );
        done();
      });
    });
  });

  it("redirect-port", function (done) {
    // Attempts to connect to redirectPort, and gets redirected to port
    var args = [
      "--ip",
      "127.0.0.1",
      "--ssl-cert",
      "test/server.crt",
      "--ssl-key",
      "test/server.key",
      "--port",
      port,
      "--default-target",
      testUrl,
      "--redirect-port",
      redirectPort,
    ];
    executeCLI(execCmd, args).then((cliProcess) => {
      childProcess = cliProcess;
      r(redirectUrl)
        .then(() => {
          fail("A 301 redirect should have been thrown.");
        })
        .catch((requestError) => {
          expect(requestError.statusCode).toEqual(301);
          expect(requestError.response.headers.location).toContain(SSLproxyUrl);
        });
      r({ url: redirectUrl, followRedirect: true }).then((body) => {
        body = JSON.parse(body);
        expect(body).toEqual(
          jasmine.objectContaining({
            name: "default",
          })
        );
        done();
      });
    });
  });

  it("redirect-to", function (done) {
    // Attempts to connect to redirectPort, and gets redirected to redirectToPort
    var args = [
      "--ip",
      "127.0.0.1",
      "--ssl-cert",
      "test/server.crt",
      "--ssl-key",
      "test/server.key",
      "--port",
      port,
      "--default-target",
      testUrl,
      "--redirect-port",
      redirectPort,
      "--redirect-to",
      redirectToPort,
    ];
    executeCLI(execCmd, args).then((cliProcess) => {
      childProcess = cliProcess;
      r(redirectUrl)
        .then(() => {
          fail("A 301 redirect should have been thrown.");
        })
        .catch((requestError) => {
          expect(requestError.statusCode).toEqual(301);
          expect(requestError.response.headers.location).toContain(redirectToUrl);
          done();
        });
    });
  });

  it("custom-header", function (done) {
    var args = [
      "--ip",
      "127.0.0.1",
      "--ssl-cert",
      "test/server.crt",
      "--ssl-key",
      "test/server.key",
      "--port",
      port,
      "--default-target",
      testUrl,
      "--custom-header",
      "k1: v1",
      "--custom-header",
      " k2 : v2 v2 ",
    ];
    executeCLI(execCmd, args).then((cliProcess) => {
      childProcess = cliProcess;
      r(SSLproxyUrl).then((body) => {
        body = JSON.parse(body);
        expect(body.headers).toEqual(
          jasmine.objectContaining({
            k1: "v1",
            k2: "v2 v2",
          })
        );
        done();
      });
    });
  });
});
