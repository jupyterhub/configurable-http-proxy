"use strict";

import http from "node:http";
import https from "node:https";
import { WebSocketServer } from "ws";
import { ConfigurableProxy } from "./configproxy.js";
import { defaultLogger } from "./log.js";

var servers = [];

// TODO: make this an options dict
export function addTarget(proxy, path, port, websocket, targetPath, sslOptions) {
  var proto = sslOptions ? "https" : "http";
  var target = proto + "://127.0.0.1:" + port;
  if (targetPath) {
    target = target + targetPath;
  }
  var server;
  var data = {
    target: target,
    path: path,
  };
  var createServer = http.createServer;
  if (sslOptions) {
    createServer = (cb) => https.createServer(sslOptions, cb);
  }

  server = createServer(function (req, res) {
    var reply = {};
    Object.assign(reply, data);
    reply.url = req.url;
    reply.headers = req.headers;
    res.write(JSON.stringify(reply));
    res.end();
  });
  if (websocket) {
    var wss = new WebSocketServer({
      server: server,
    });
    wss.on("connection", function (ws) {
      ws.on("message", function (message) {
        var reply = {};
        Object.assign(reply, data);
        reply.message = message.toString();
        ws.send(JSON.stringify(reply));
      });
      ws.send("connected");
    });
  }

  server.listen(port);
  servers.push(server);
  return proxy.addRoute(path, { target: target }).then(() => {
    // routes are created with an activity timestamp artificially shifted into the past
    // so that activity can more easily be measured
    return proxy._routes.update(path, { last_activity: proxy._setup_timestamp });
  });
}

export function addTargetRedirecting(proxy, path, port, targetPath, redirectTo) {
  // Like the above, but the server returns a redirect response with a Location header.
  // Cannot use default arguments as they are apparently not supported.
  var target = "http://127.0.0.1:" + port;
  if (targetPath) {
    target = target + targetPath;
  }

  return proxy.addRoute(path, { target: target }).then(function (route) {
    var server = http.createServer(function (req, res) {
      res.setHeader("Location", redirectTo);
      res.statusCode = 301;
      res.write("");
      res.end();
    });

    server.listen(port);
    servers.push(server);
  });
}

export function addTargets(proxy, paths, port) {
  if (paths.length === 0) {
    return Promise.resolve();
  }
  return addTarget(proxy, paths[0], port, true, null).then(function () {
    return addTargets(proxy, paths.slice(1), port + 1);
  });
}

export function setupProxy(port, options, paths) {
  options = options || {};
  options.authToken = "secret";
  options.log = defaultLogger({ level: "error" });

  var proxy = new ConfigurableProxy(options);
  proxy._setup_timestamp = new Date(new Date().getTime() - 60000);
  var ip = "127.0.0.1";
  var countdown = 2;
  var resolvePromise;

  var p = new Promise((resolve, reject) => {
    resolvePromise = resolve;
  });

  var onlisten = function () {
    if (--countdown === 0) {
      resolvePromise(proxy);
    }
  };

  if (options.errorTarget) {
    countdown++;
    var errorServer = http.createServer(function (req, res) {
      var query = new URL(req.url, "http://example.com").searchParams;
      res.setHeader("Content-Type", "text/plain");
      req.on("data", function () {});
      req.on("end", function () {
        res.write(query.get("url"));
        res.end();
      });
    });
    errorServer.on("listening", onlisten);
    const errorUrl = new URL(options.errorTarget);
    errorServer.listen(errorUrl.port, ip);
    servers.push(errorServer);
  }

  servers.push(proxy.apiServer);
  servers.push(proxy.proxyServer);
  if (options.enableMetrics) {
    servers.push(proxy.metricsServer);
  }
  proxy.apiServer.on("listening", onlisten);
  proxy.proxyServer.on("listening", onlisten);

  addTargets(proxy, paths || ["/"], port + 2).then(function () {
    proxy.proxyServer.listen(port, ip);
    proxy.apiServer.listen(port + 1, ip);
    if (options.enableMetrics) {
      proxy.metricsServer.listen(port + 3, ip);
    }
  });
  return p;
}

export function teardownServers(callback) {
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
    // closeAllConnections is implied in close in node >=19
    // but this avoids waits between all tests with node 18
    servers[i].closeAllConnections();
  }
}
