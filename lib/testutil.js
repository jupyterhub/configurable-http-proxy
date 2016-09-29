var http = require('http');
var URL = require('url');
var extend = require('util')._extend;
var WebSocketServer = require('ws').Server;
var querystring = require('querystring');

var configproxy = require('../lib/configproxy');

var servers = [];

var add_target = exports.add_target = function (proxy, path, port, websocket, target_path, cb) {
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
        reply.headers = req.headers;
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
    proxy.add_route(path, {target: target}, cb);
};

var add_target_redirecting = exports.add_target_redirecting = function (proxy, path, port, target_path, redirect_to) {
    // Like the above, but the server returns a redirect response with a Location header.
    // Cannot use default arguments as they are apparently not supported.
    var target = 'http://127.0.0.1:' + port;
    if (target_path) {
        target = target + target_path;
    }

    proxy.add_route(path, { target: target }, function (route) {
        var server = http.createServer(function (req, res) {
            res.setHeader("Location", redirect_to);
            res.statusCode = 301;
            res.write('');
            res.end();
        });

        server.listen(port);
        servers.push(server);
    });
};

function add_targets (proxy, paths, port, callback) {
    var remainingPaths = paths.length;
    if (remainingPaths === 0) {
      callback();
      return;
    }

    paths.forEach(function (path) {
        add_target(proxy, path, ++port, true, null, function () {
            if (--remainingPaths === 0) {
              callback();
            }
        });
    });
}

exports.setup_proxy = function (port, callback, options, paths) {
    options = options || {};
    options.auth_token = 'secret';

    var proxy = new configproxy.ConfigurableProxy(options);
    var ip = '127.0.0.1';
    var countdown = 2;

    var onlisten = function () {
        if (--countdown === 0) {
            if (callback) {
                callback(proxy);
            }
        }
    };

    if (options.error_target) {
        countdown++;
        var error_server = http.createServer(function (req, res) {
            var parsed = URL.parse(req.url);
            var query = querystring.parse(parsed.query);
            res.setHeader('Content-Type', 'text/plain');
            req.on('data', function () {});
            req.on('end', function () {
                res.write(query.url);
                res.end();
            });
        });
        error_server.on('listening', onlisten);
        error_server.listen(URL.parse(options.error_target).port, ip);
        servers.push(error_server);
    }

    servers.push(proxy.proxy_server);
    servers.push(proxy.api_server);
    proxy.api_server.on('listening', onlisten);
    proxy.proxy_server.on('listening', onlisten);

    add_targets(proxy, paths || ["/"], port + 1, function () {
        proxy.proxy_server.listen(port, ip);
        proxy.api_server.listen(port + 1, ip);
    });
};

exports.teardown_servers = function (callback) {
    var count = 0;
    var onclose = function () {
        count = count + 1;
        if (count === servers.length) {
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
