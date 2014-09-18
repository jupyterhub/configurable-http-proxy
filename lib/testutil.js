// jshint node: true
"use strict";

var http = require('http');
var WebSocketServer = require('ws').Server;

var configproxy = require('../lib/configproxy');

var servers = [];

exports.add_target = function (proxy, path, port, websocket) {
    var target = 'http://127.0.0.1:' + port;
    var server;
    if (websocket) {
        server = new WebSocketServer({ port: port });
        server.on('connection', function(ws) {
          ws.on('message', function(message) {
              ws.send(message);
          });
          ws.send('connected');
        });
    } else {
        server = http.createServer(function (req, res) {
            res.write(req.url);
            res.end();
        });
        server.listen(port);
    }
    servers.push(server);
    proxy.add_route(path, {target: target});
};

exports.setup_proxy = function (port, callback) {
    var proxy = new configproxy.ConfigurableProxy({
        auth_token: 'secret',
        default_target: "http://127.0.0.1:" + port + 2,
    });
    var ip = '127.0.0.1';

    var count = 0;
    var onlisten = function () {
        count = count + 1;
        if (count == 2) {
            if (callback) {
                callback();
            }
        }
    };
    
    proxy.proxy_server.listen(port, ip);
    proxy.api_server.listen(port + 1, ip);
    servers.push(proxy.proxy_server);
    servers.push(proxy.api_server);
    proxy.api_server.on('listening', onlisten);
    proxy.proxy_server.on('listening', onlisten);
    return proxy;
};

exports.teardown_servers = function (callback) {
    var count = 0;
    var onclose = function () {
        count = count + 1;
        if (count == servers.length) {
            servers = [];
            callback();
        }
    };
    for (var i = servers.length - 1; i >= 0; i--) {
        servers[i].close(onclose);
    }
};

var onfinish = exports.onfinish = function (res, callback) {
  res.body = '';
  res.on('data', function (chunk) {
      res.body += chunk;
  });
  res.on('end', function () {
      callback(res);
  });
};

