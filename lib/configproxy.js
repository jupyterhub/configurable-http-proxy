// A Configurable node-http-proxy
//
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
//
// POST, DELETE to /api/routes[:/path/to/proxy] to update the routing table
// GET /api/routes to see the current routing table
//
"use strict";

var http = require("http"),
  https = require("https"),
  fs = require("fs"),
  path = require("path"),
  EventEmitter = require("events").EventEmitter,
  httpProxy = require("http-proxy"),
  log = require("winston"),
  util = require("util"),
  URL = require("url"),
  querystring = require("querystring");

function bound(that, method) {
  // bind a method, to ensure `this=that` when it is called
  // because prototype languages are bad
  return function() {
    return method.apply(that, arguments);
  };
}

function argumentsArray(args) {
  // cast arguments object to array, because Javascript.
  return Array.prototype.slice.call(args, 0);
}

function fail(req, res, code, msg) {
  // log a failure, and finish the HTTP request with an error code
  msg = msg || "";
  if (res.writeHead) res.writeHead(code);
  if (res.write) {
    if (!msg) {
      msg = http.STATUS_CODES[code];
    }
    res.write(msg);
    res._logMsg = msg;
  }
  if (res.end) res.end();
}

function jsonHandler(handler) {
  // wrap json handler, so the handler is called with parsed data,
  // rather than implementing streaming parsing in the handler itself
  return function(req, res) {
    var args = argumentsArray(arguments);
    var buf = "";
    req.on("data", function(chunk) {
      buf += chunk;
    });
    req.on("end", function() {
      var data;
      try {
        data = JSON.parse(buf) || {};
      } catch (e) {
        fail(req, res, 400, "Body not valid JSON: " + e);
        return;
      }
      args.push(data);
      handler.apply(handler, args);
    });
  };
}

function authorized(method) {
  // decorator for token-authorized handlers
  return function(req, res) {
    if (!this.authToken) {
      return method.apply(this, arguments);
    }
    var match = (req.headers.authorization || "").match(/token\s+(\S+)/);
    var token;
    if (match !== null) {
      token = match[1];
    }
    if (token === this.authToken) {
      return method.apply(this, arguments);
    } else {
      log.debug("Rejecting API request from: %s", req.headers.authorization || "no authorization");
      res.writeHead(403);
      res.end();
    }
  };
}

function parseHost(req) {
  var host = req.headers.host;
  if (host) {
    host = host.split(":")[0];
  }
  return host;
}

function logResponse(req, res) {
  // log function called when any response is finished
  var code = res.statusCode;
  var logF;
  if (code < 400) {
    logF = log.info;
  } else if (code < 500) {
    logF = log.warn;
  } else {
    logF = log.error;
  }
  var msg = res._logMsg || "";
  logF("%s %s %s %s", code, req.method.toUpperCase(), req.url, msg);
}

function camelCaseify(options) {
  // camelCaseify options dict, for backward compatibility
  let camelOptions = {};
  Object.keys(options).forEach(key => {
    const camelKey = key.replace(/_(.)/g, function(match, part, offset, string) {
      return part.toUpperCase();
    });
    if (camelKey !== key) {
      log.warn("option %s is deprecated, use %s.", key, camelKey);
    }
    camelOptions[camelKey] = options[key];
  });
  return camelOptions;
}

const loadStorage = options => {
  if (options.storageBackend) {
    const BackendStorageClass = require(options.storageBackend);
    return new BackendStorageClass(options);
  }

  // loads default storage strategy
  const store = require("./store.js");
  return new store.MemoryStore(options);
};

class ConfigurableProxy extends EventEmitter {
  constructor(options) {
    super();
    var that = this;
    this.options = camelCaseify(options || {});

    this._routes = loadStorage(options || {});
    this.authToken = this.options.authToken;
    if (options.includePrefix !== undefined) {
      this.includePrefix = options.includePrefix;
    } else {
      this.includePrefix = true;
    }
    this.hostRouting = this.options.hostRouting;
    this.errorTarget = options.errorTarget;
    if (this.errorTarget && this.errorTarget.slice(-1) !== "/") {
      this.errorTarget = this.errorTarget + "/"; // ensure trailing /
    }
    this.errorPath = options.errorPath || path.join(__dirname, "error");
    if (options.statsd) {
      this.statsd = options.statsd;
    } else {
      // Mock the statsd object, rather than pepper the codebase with
      // null checks. FIXME: Maybe use a JS Proxy object (if available?)
      this.statsd = {
        increment: function() {},
        decrement: function() {},
        timing: function() {},
        gauge: function() {},
        set: function() {},
        createTimer: function() {
          return {
            stop: function() {},
          };
        },
      };
    }

    if (this.options.defaultTarget) {
      this.addRoute("/", {
        target: this.options.defaultTarget,
      });
    }
    options.ws = true;
    var proxy = (this.proxy = httpProxy.createProxyServer(options));

    // tornado-style regex routing,
    // because cross-language cargo-culting is always a good idea

    this.apiHandlers = [
      [
        /^\/api\/routes(\/.*)?$/,
        {
          get: bound(this, authorized(this.getRoutes)),
          post: jsonHandler(bound(this, authorized(this.postRoutes))),
          delete: bound(this, authorized(this.deleteRoutes)),
        },
      ],
    ];

    var logErrors = function(handler) {
      return function(req, res) {
        function logError(e) {
          log.error("Error in handler for " + req.method + " " + req.url + ": ", e);
        }
        try {
          let p = handler.apply(that, arguments);
          if (p) {
            return p.catch(logError);
          }
        } catch (e) {
          logError(e);
        }
      };
    };

    // handle API requests
    var apiCallback = logErrors(that.handleApiRequest);
    if (this.options.apiSsl) {
      this.apiServer = https.createServer(this.options.apiSsl, apiCallback);
    } else {
      this.apiServer = http.createServer(apiCallback);
    }

    // proxy requests separately
    var proxyCallback = logErrors(this.handleProxyWeb);
    if (this.options.ssl) {
      this.proxyServer = https.createServer(this.options.ssl, proxyCallback);
    } else {
      this.proxyServer = http.createServer(proxyCallback);
    }
    // proxy websockets
    this.proxyServer.on("upgrade", bound(this, this.handleProxyWs));

    this.proxy.on("proxyRes", function(proxyRes, req, res) {
      that.statsd.increment("requests." + proxyRes.statusCode, 1);
    });
  }

  addRoute(path, data) {
    // add a route to the routing table
    path = this._routes.cleanPath(path);
    if (this.hostRouting && path !== "/") {
      data.host = path.split("/")[1];
    }
    log.info("Adding route %s -> %s", path, data.target);

    var that = this;

    // Parse target into object to attach ssl params. The underlying
    // http-proxy library will use this to attach ssl to the forwarded
    // request.
    data.target = URL.parse(data.target);
    if(this.options.forwardSsl){
        data.target.key = this.options.api_ssl.key;
        data.target.cert = this.options.api_ssl.cert;
        data.target.ca = this.options.api_ssl.ca;
    }

    this._routes.add(path, data, function () {
      that.update_last_activity(path, function () {
        if (typeof(cb) === "function") {
          cb();
        }
      });
    });
  }

  removeRoute(path) {
    // remove a route from the routing table
    var routes = this._routes;

    return routes.get(path).then(result => {
      if (result) {
        log.info("Removing route %s", path);
        return routes.remove(path);
      }
    });
  }

  getRoute(req, res, path) {
    // GET a single route
    path = this._routes.cleanPath(path);
    return this._routes.get(path).then(function(route) {
      if (!route) {
        res.writeHead(404);
        res.end();
        return;
      } else {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.write(JSON.stringify(route));
        res.end();
      }
    });
  }

  getRoutes(req, res, path) {
    // GET /api/routes/(path) gets a single route
    if (path && path.length && path !== "/") {
      return this.getRoute(req, res, path);
    }
    // GET returns routing table as JSON dict
    var that = this;
    var parsed = URL.parse(req.url);
    var inactiveSince = null;
    if (parsed.query) {
      var query = querystring.parse(parsed.query);
      if (query.inactive_since !== undefined) {
        // camelCaseify
        query.inactiveSince = query.inactive_since;
      }

      if (query.inactiveSince !== undefined) {
        var timestamp = Date.parse(query.inactiveSince);
        if (isFinite(timestamp)) {
          inactiveSince = new Date(timestamp);
        } else {
          fail(req, res, 400, "Invalid datestamp '" + query.inactiveSince + "' must be ISO8601.");
          return;
        }
      }
    }
    res.writeHead(200, { "Content-Type": "application/json" });

    return this._routes.getAll().then(routes => {
      var results = {};

      if (inactiveSince) {
        Object.keys(routes).forEach(function(path) {
          if (routes[path].last_activity < inactiveSince) {
            results[path] = routes[path];
          }
        });
      } else {
        results = routes;
      }

      res.write(JSON.stringify(results));
      res.end();
      that.statsd.increment("api.route.get", 1);
    });
  }

  postRoutes(req, res, path, data) {
    // POST adds a new route
    path = path || "/";

    if (typeof data.target !== "string") {
      log.warn("Bad POST data: %s", JSON.stringify(data));
      fail(req, res, 400, "Must specify 'target' as string");
      return;
    }

    var that = this;
    return this.addRoute(path, data).then(function() {
      res.writeHead(201);
      res.end();
      that.statsd.increment("api.route.add", 1);
    });
  }

  deleteRoutes(req, res, path) {
    // DELETE removes an existing route

    return this._routes.get(path).then(result => {
      var p, code;
      if (result) {
        p = this.removeRoute(path);
        code = 204;
      } else {
        p = Promise.resolve();
        code = 404;
      }
      return p.then(() => {
        res.writeHead(code);
        res.end();
        this.statsd.increment("api.route.delete", 1);
      });
    });
  }

  targetForReq(req) {
    var timer = this.statsd.createTimer("find_target_for_req");
    // return proxy target for a given url path
    var basePath = this.hostRouting ? "/" + parseHost(req) : "";
    var path = basePath + decodeURIComponent(URL.parse(req.url).pathname);

    return this._routes.getTarget(path).then(function(route) {
      timer.stop();
      if (route) {
        return {
          prefix: route.prefix,
          target: route.data.target,
        };
      }
    });
  }

  updateLastActivity(prefix) {
    var timer = this.statsd.createTimer("last_activity_updating");
    var routes = this._routes;

    return routes
      .get(prefix)
      .then(function(result) {
        if (result) {
          return routes.update(prefix, { last_activity: new Date() });
        }
      })
      .then(timer.stop);
  }

  _handleProxyErrorDefault(code, kind, req, res) {
    // called when no custom error handler is registered,
    // or is registered and doesn't work
    if (!res.headersSent && res.writeHead) res.writeHead(code);
    if (res.write) res.write(http.STATUS_CODES[code]);
    if (res.end) res.end();
  }

  handleProxyError(code, kind, req, res, e) {
    // called when proxy itself has an error
    // so far, just 404 for no target and 503 for target not responding
    // custom error server gets `/CODE?url=/escapedUrl/`, e.g.
    // /404?url=%2Fuser%2Ffoo

    var proxy = this;
    var errMsg = "";
    this.statsd.increment("requests." + code, 1);
    if (e) {
      // avoid stack traces on known not-our-problem errors:
      // ECONNREFUSED (backend isn't there)
      // ECONNRESET (backend is there, but didn't respond)
      if (e.code === "ECONNRESET" || e.code === "ECONNREFUSED") {
        errMsg = e.message;
      } else {
        // logging the error object shows a stack trace.
        // Anything that gets here is an unknown error,
        // so log more info.
        errMsg = e;
      }
    }
    log.error("%s %s %s", code, req.method, req.url, errMsg);
    if (!res) {
      // socket-level error, no response to build
      return;
    }
    if (this.errorTarget) {
      var urlSpec = URL.parse(this.errorTarget);
      urlSpec.search = "?" + querystring.encode({ url: req.url });
      urlSpec.pathname = urlSpec.pathname + code.toString();
      var url = URL.format(urlSpec);
      var errorRequest = http.request(url, function(upstream) {
        ["content-type", "content-encoding"].map(function(key) {
          if (!upstream.headers[key]) return;
          if (res.setHeader) res.setHeader(key, upstream.headers[key]);
        });
        if (res.writeHead) res.writeHead(code);
        upstream.on("data", function(data) {
          if (res.write) res.write(data);
        });
        upstream.on("end", function() {
          if (res.end) res.end();
        });
      });
      errorRequest.on("error", function(e) {
        // custom error failed, fallback on default
        log.error("Failed to get custom error page", e);
        proxy._handleProxyErrorDefault(code, kind, req, res);
      });
      errorRequest.end();
    } else if (this.errorPath) {
      var filename = path.join(this.errorPath, code.toString() + ".html");
      if (!fs.existsSync(filename)) {
        log.debug("No error file %s", filename);
        filename = path.join(this.errorPath, "error.html");
        if (!fs.existsSync(filename)) {
          log.error("No error file %s", filename);
          proxy._handleProxyErrorDefault(code, kind, req, res);
          return;
        }
      }
      fs.readFile(filename, function(err, data) {
        if (err) {
          log.error("Error reading %s %s", filename, err);
          proxy._handleProxyErrorDefault(code, kind, req, res);
          return;
        }
        if (res.writeHead) res.writeHead(code, { "Content-Type": "text/html" });
        if (res.write) res.write(data);
        if (res.end) res.end();
      });
    } else {
      this._handleProxyErrorDefault(code, kind, req, res);
    }
  }

  handleProxy(kind, req, res) {
    // proxy any request
    var that = this;
    var args = Array.prototype.slice.call(arguments, 1);

    // get the proxy target
    return this.targetForReq(req).then(function(match) {
      if (!match) {
        that.handleProxyError(404, kind, req, res);
        return;
      }

      that.emit("proxyRequest", req, res);
      var prefix = match.prefix;
      var target = match.target;
      log.debug("PROXY", kind.toUpperCase(), req.url, "to", target);
      if (!that.includePrefix) {
        req.url = req.url.slice(prefix.length);
      }

      // add config argument
      args.push({ target: target });

      // add error handling
      args.push(function(e) {
        that.handleProxyError(503, kind, req, res, e);
      });

      // dispatch the actual method
      that.proxy[kind].apply(that.proxy, args);

      // update timestamp on any request/reply data as well (this includes websocket data)
      req.on("data", function() {
        that.updateLastActivity(prefix);
      });

      res.on("data", function() {
        that.updateLastActivity(prefix);
      });

      // update last activity timestamp in routing table
      return that.updateLastActivity(prefix);
    });
  }

  handleProxyWs(req, res, head) {
    // Proxy a websocket request
    this.statsd.increment("requests.ws", 1);
    return this.handleProxy("ws", req, res, head);
  }

  handleProxyWeb(req, res) {
    // Proxy a web request
    this.statsd.increment("requests.web", 1);
    return this.handleProxy("web", req, res);
  }

  handleApiRequest(req, res) {
    // Handle a request to the REST API
    this.statsd.increment("requests.api", 1);
    if (res) {
      res.on("finish", function() {
        logResponse(req, res);
      });
    }
    var args = [req, res];
    function pushPathArg(arg) {
      args.push(arg === undefined ? arg : decodeURIComponent(arg));
    }
    var path = URL.parse(req.url).pathname;
    for (var i = 0; i < this.apiHandlers.length; i++) {
      var pat = this.apiHandlers[i][0];
      var match = pat.exec(path);
      if (match) {
        var handlers = this.apiHandlers[i][1];
        var handler = handlers[req.method.toLowerCase()];
        if (!handler) {
          // 405 on found resource, but not found method
          fail(req, res, 405, "Method not supported");
          return Promise.resolve();
        }
        match.slice(1).forEach(pushPathArg);
        return handler.apply(handler, args) || Promise.resolve();
      }
    }
    fail(req, res, 404);
  }
}

exports.ConfigurableProxy = ConfigurableProxy;
