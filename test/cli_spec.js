// jshint jasmine: true
"use strict";

const http = require('http');
var spawn = require("child_process").spawn;
var request = require("request-promise-native");

// utility functions
function executeCLI(execCmd = "bin/configurable-http-proxy", args = []) {
    var cliProcess = spawn(execCmd, args);
    const cliReady = new Promise((resolve, reject) => {
        cliProcess.stdout.on('data', (data) => {
            if (data.includes("Route added /")) {
                resolve(cliProcess);
            }
        });
    });
    return(cliReady);
}

var servers = [];

function addServer(name, port) {
  var server = http.createServer(function(req, res) {
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
  return(serverListening);
}

function teardownServers() {
    var count = 0;
    var onclose = function() {
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

describe("CLI Tests", function() {
  var execCmd = "bin/configurable-http-proxy"
  var port = 8902;
  var apiPort = port + 1;
  var testPort = port + 10;
  var redirectPort = testPort + 1;
  var childProcess;
  var proxyUrl = "http://127.0.0.1:" + port;
  var SSLproxyUrl = "https://127.0.0.1:" + port;
  var testUrl = "http://127.0.0.1:" + testPort;
  var redirectUrl = "http://127.0.0.1:" + redirectPort;

  var r = request.defaults({
    method: "GET",
    url: proxyUrl,
    followRedirect: false,
    strictSSL: false
  });

  beforeEach(function(callback) {
    addServer("default", testPort).then(callback);
  });

  afterEach(function(callback) {
    teardownServers();
    childProcess.on('exit', () => {
        callback();
    });
    childProcess.kill();
  });

  it("basic HTTP request", function(done) {
    var args = [
        '--ip', '127.0.0.1',
        '--port', port,
        '--default-target', testUrl
    ];
    executeCLI(execCmd, args).then((cliProcess) => {
        childProcess = cliProcess;
        r(proxyUrl).then(body => {
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

  it("basic HTTPS request", function(done) {
    var args = [
        '--ip', '127.0.0.1',
        '--ssl-cert', 'test/server.crt',
        '--ssl-key', 'test/server.key',
        '--port', port,
        '--default-target', testUrl
    ];
    executeCLI(execCmd, args).then((cliProcess) => {
        childProcess = cliProcess;
        r(SSLproxyUrl).then(body => {
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

  it("redirect-port", function(done) {
    var args = [
        '--ip', '127.0.0.1',
        '--ssl-cert', 'test/server.crt',
        '--ssl-key', 'test/server.key',
        '--port', port,
        '--default-target', testUrl,
        '--redirect-port', redirectPort
    ];
    executeCLI(execCmd, args).then((cliProcess) => {
        childProcess = cliProcess;
        r(redirectUrl).then(() => {
            fail('A 301 redirect should have been thrown.');
        }).catch((requestError) => {
          expect(requestError.statusCode).toEqual(301);
          expect(requestError.response.headers.location).toEqual("https://127.0.0.1:8902/");
        });
        r({url: redirectUrl, followRedirect: true}).then(body => {
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
});
