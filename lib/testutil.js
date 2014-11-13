// jshint node: true
"use strict";

var http = require('http');
var extend = require('util')._extend;
var WebSocketServer = require('ws').Server;

var configproxy = require('../lib/configproxy');

var servers = [];

var add_target = exports.add_target = function (proxy, path, port, websocket, target_path) {
    var target = 'http://127.0.0.1:' + port;
    if (target_path) {
        target = target + target_path;
    }
    var server;
    var data = {
        target: target,
        path: path,
    };

    server = http.createServer(function (req, res) {
        var reply = extend({}, data);
        reply.url = req.url;
        res.write(JSON.stringify(reply));
        res.end();
    });
    if (websocket) {
        var wss = new WebSocketServer({
            server: server
        });
        wss.on('connection', function(ws) {
          ws.on('message', function(message) {
              var reply = extend({}, data);
              reply.message = message;
              ws.send(JSON.stringify(reply));
          });
          ws.send('connected');
        });
    }
    server.listen(port);
    servers.push(server);
    proxy.add_route(path, {target: target});
};

exports.setup_proxy = function (port, callback, options, paths) {
    options = options || {};
    options.auth_token = 'secret';
    var proxy = new configproxy.ConfigurableProxy(options);
    // add default route
    var p = port + 1;
    paths = paths || ['/'];
    paths.map(function (path) {
        p = p + 1;
        add_target(proxy, path, p, true);
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

