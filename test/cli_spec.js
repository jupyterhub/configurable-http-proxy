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

describe("CLI Tests", function() {
  var execCmd = "bin/configurable-http-proxy"
  var port = 8902;
  var apiPort = port + 1;
  var testPort = port + 10;
  var childProcess;
  var proxyUrl = "http://127.0.0.1:" + port;
  var apiUrl = "http://127.0.0.1:" + apiPort;
  var testUrl = "http://127.0.0.1:" + testPort;
  var server;

  var r = request.defaults({
    method: "GET",
    url: proxyUrl,
    followRedirect: false,
  });

  beforeEach(function(callback) {
    server = http.createServer(function(req, res) {
        var reply = {};
        reply.url = req.url;
        reply.headers = req.headers;
        res.write(JSON.stringify(reply));
        res.end();
      });
    server.listen(testPort);
    callback();
  });

  afterEach(function(callback) {
    childProcess.on('exit', (code, signal) => {
        callback();
    });
    server.close(() => {
        childProcess.kill();
    });
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
                url: "/",
              })
            );
            done();
          });
    });
  });

});
