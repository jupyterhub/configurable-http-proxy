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
  winston = require("winston"),
  util = require("util"),
  URL = require("url"),
  defaultLogger = require("./log").defaultLogger,
  querystring = require("querystring"),
  metrics = require("./metrics");

function bound(that, method) {
  // bind a method, to ensure `this=that` when it is called
  // because prototype languages are bad
  return function () {
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
  res._logMsg = msg;

  if (res.writableEnded) return; // response already done
  if (res.writeHead) res.writeHead(code);
  if (res.write) {
    if (!msg) {
      msg = http.STATUS_CODES[code];
    }
    res.write(msg);
  }
  if (res.end) res.end();
}

function jsonHandler(handler) {
  // wrap json handler, so the handler is called with parsed data,
  // rather than implementing streaming parsing in the handler itself
  return function (req, res) {
    var args = argumentsArray(arguments);
    var buf = "";
    req.on("data", function (chunk) {
      buf += chunk;
    });
    req.on("end", function () {
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
  return function (req, res) {
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
      this.log.debug(
        "Rejecting API request from: %s",
        req.headers.authorization || "no authorization"
      );
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

function camelCaseify(options) {
  // camelCaseify options dict, for backward compatibility
  let camelOptions = {};
  Object.keys(options).forEach((key) => {
    const camelKey = key.replace(/_(.)/g, function (match, part, offset, string) {
      return part.toUpperCase();
    });
    if (camelKey !== key) {
      this.log.warn("option %s is deprecated, use %s.", key, camelKey);
    }
    camelOptions[camelKey] = options[key];
  });
  return camelOptions;
}

const loadStorage = (options) => {
  if (options.storageBackend) {
    const BackendStorageClass = require(options.storageBackend);
    return new BackendStorageClass(options);
  }

  // loads default storage strategy
  const store = require("./store.js");
  return new store.MemoryStore(options);
};

function _logUrl(url) {
  // format a url for logging, e.g. strip url params
  if (url) return url.split("?", 1)[0];
}

class ConfigurableProxy extends EventEmitter {
  constructor(options) {
    super();
    var that = this;
    this.log = (options || {}).log;
    if (!this.log) {
      this.log = defaultLogger();
    }
    this.options = camelCaseify.apply(this, [options || {}]);

    this._routes = loadStorage(options || {});
    this.authToken = this.options.authToken;
    if (options.includePrefix !== undefined) {
      this.includePrefix = options.includePrefix;
    } else {
      this.includePrefix = true;
    }
    this.headers = this.options.headers;
    this.hostRouting = this.options.hostRouting;
    this.errorTarget = options.errorTarget;
    if (this.errorTarget && this.errorTarget.slice(-1) !== "/") {
      this.errorTarget = this.errorTarget + "/"; // ensure trailing /
    }
    this.errorPath = options.errorPath || path.join(__dirname, "error");

    if (this.options.enableMetrics) {
      this.metrics = new metrics.Metrics();
    } else {
      this.metrics = new metrics.MockMetrics();
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

    var logErrors = (handler) => {
      return function (req, res) {
        function logError(e) {
          that.log.error("Error in handler for %s %s: %s", req.method, _logUrl(req.url), e);
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

    // handle metrics
    if (this.options.enableMetrics) {
      var metricsCallback = logErrors(that.handleMetrics);
      this.metricsServer = http.createServer(metricsCallback);
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

    this.proxy.on("proxyRes", function (proxyRes, req, res) {
      that.metrics.requestsProxyCount.labels(proxyRes.statusCode).inc();
    });
  }

  logResponse(req, res) {
    // log function called when any response is finished
    var code = res.statusCode;
    var logF;
    if (code < 400) {
      logF = this.log.info;
    } else if (code < 500) {
      logF = this.log.warn;
    } else {
      logF = this.log.error;
    }
    var msg = res._logMsg || "";
    logF("%s %s %s %s", code, req.method.toUpperCase(), _logUrl(req.url), msg);
  }

  addRoute(path, data) {
    // add a route to the routing table
    path = this._routes.cleanPath(path);
    if (this.hostRouting && path !== "/") {
      data.host = path.split("/")[1];
    }
    this.log.info("Adding route %s -> %s", path, data.target);

    var that = this;

    return this._routes.add(path, data).then(() => {
      that.updateLastActivity(path);
      that.log.info("Route added %s -> %s", path, data.target);
    });
  }

  removeRoute(path) {
    // remove a route from the routing table
    var routes = this._routes;

    return routes.get(path).then((result) => {
      if (result) {
        this.log.info("Removing route %s", path);
        return routes.remove(path);
      }
    });
  }

  getRoute(req, res, path) {
    // GET a single route
    path = this._routes.cleanPath(path);
    return this._routes.get(path).then(function (route) {
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

    return this._routes.getAll().then((routes) => {
      var results = {};

      if (inactiveSince) {
        Object.keys(routes).forEach(function (path) {
          if (routes[path].last_activity < inactiveSince) {
            results[path] = routes[path];
          }
        });
      } else {
        results = routes;
      }

      res.write(JSON.stringify(results));
      res.end();
      that.metrics.apiRouteGetCount.inc();
    });
  }

  postRoutes(req, res, path, data) {
    // POST adds a new route
    path = path || "/";

    if (typeof data.target !== "string") {
      this.log.warn("Bad POST data: %s", JSON.stringify(data));
      fail(req, res, 400, "Must specify 'target' as string");
      return;
    }

    var that = this;
    return this.addRoute(path, data).then(function () {
      res.writeHead(201);
      res.end();
      that.metrics.apiRouteAddCount.inc();
    });
  }

  deleteRoutes(req, res, path) {
    // DELETE removes an existing route

    return this._routes.get(path).then((result) => {
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
        this.metrics.apiRouteDeleteCount.inc();
      });
    });
  }

  async targetForReq(req) {
    var metricsTimerEnd = this.metrics.findTargetForReqSummary.startTimer();
    // return proxy target for a given url path
    var basePath = this.hostRouting ? "/" + parseHost(req) : "";
    var path = basePath + decodeURIComponent(URL.parse(req.url).pathname);
    var route = await this._routes.getTarget(path);
    metricsTimerEnd();
    if (route) {
      return {
        prefix: route.prefix,
        target: route.data.target,
      };
    }
  }

  updateLastActivity(prefix) {
    var metricsTimerEnd = this.metrics.lastActivityUpdatingSummary.startTimer();
    var routes = this._routes;

    return routes
      .get(prefix)
      .then(function (result) {
        if (result) {
          return routes.update(prefix, { last_activity: new Date() });
        }
      })
      .then(metricsTimerEnd);
  }

  _handleProxyErrorDefault(code, kind, req, res) {
    // called when no custom error handler is registered,
    // or is registered and doesn't work
    if (res.writableEnded) return; // response already done
    if (!res.headersSent && res.writeHead) res.writeHead(code);
    if (res.write) res.write(http.STATUS_CODES[code]);
    if (res.end) res.end();
  }

  handleProxyError(code, kind, req, res, e) {
    // called when proxy itself has an error
    // so far, just 404 for no target and 503 for target not responding
    // custom error server gets `/CODE?url=/escapedUrl/`, e.g.
    // /404?url=%2Fuser%2Ffoo

    var errMsg = "";
    this.metrics.requestsProxyCount.labels(code).inc();
    if (e) {
      // avoid stack traces on known not-our-problem errors:
      // ECONNREFUSED, EHOSTUNREACH (backend isn't there)
      // ECONNRESET, ETIMEDOUT (backend is there, but didn't respond)
      switch (e.code) {
        case "ECONNREFUSED":
        case "ECONNRESET":
        case "EHOSTUNREACH":
        case "ETIMEDOUT":
          errMsg = e.message;
          break;
        default:
          // logging the error object shows a stack trace.
          // Anything that gets here is an unknown error,
          // so log more info.
          errMsg = e;
      }
    }
    this.log.error("%s %s %s %s", code, req.method, _logUrl(req.url), errMsg);
    if (!res) {
      this.log.debug("Socket error, no response to send");
      // socket-level error, no response to build
      return;
    }
    if (this.errorTarget) {
      var urlSpec = URL.parse(this.errorTarget);
      // error request is $errorTarget/$code?url=$requestUrl
      urlSpec.search = "?" + querystring.encode({ url: req.url });
      urlSpec.pathname = urlSpec.pathname + code.toString();
      var secure = /https/gi.test(urlSpec.protocol) ? true : false;
      var url = URL.format(urlSpec);
      this.log.debug("Requesting custom error page: %s", urlSpec.format());

      // construct request target from urlSpec
      var target = URL.parse(url);
      target.method = "GET";

      // add client SSL config if error target is using https
      if (secure && this.options.clientSsl) {
        target.key = this.options.clientSsl.key;
        target.cert = this.options.clientSsl.cert;
        target.ca = this.options.clientSsl.ca;
      }

      var errorRequest = (secure ? https : http).request(target, function (upstream) {
        if (res.writableEnded) return; // response already done
        ["content-type", "content-encoding"].map(function (key) {
          if (!upstream.headers[key]) return;
          if (res.setHeader) res.setHeader(key, upstream.headers[key]);
        });
        if (res.writeHead) res.writeHead(code);
        upstream.on("data", (data) => {
          if (res.write && !res.writableEnded) res.write(data);
        });
        upstream.on("end", () => {
          if (res.end) res.end();
        });
      });
      errorRequest.on("error", (e) => {
        // custom error failed, fallback on default
        this.log.error("Failed to get custom error page: %s", e);
        this._handleProxyErrorDefault(code, kind, req, res);
      });
      errorRequest.end();
    } else if (this.errorPath) {
      var filename = path.join(this.errorPath, code.toString() + ".html");
      if (!fs.existsSync(filename)) {
        this.log.debug("No error file %s", filename);
        filename = path.join(this.errorPath, "error.html");
        if (!fs.existsSync(filename)) {
          this.log.error("No error file %s", filename);
          this._handleProxyErrorDefault(code, kind, req, res);
          return;
        }
      }
      fs.readFile(filename, (err, data) => {
        if (err) {
          this.log.error("Error reading %s %s", filename, err);
          this._handleProxyErrorDefault(code, kind, req, res);
          return;
        }
        if (!res.writable) return; // response already done
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

    // handleProxy is invoked by handleProxyWeb and handleProxyWs, which pass
    // different arguments to handleProxy.
    // - handleProxyWeb: args = [req, res]
    // - handleProxyWs: args = [req, socket, head]
    var args = Array.prototype.slice.call(arguments, 1);

    // get the proxy target
    return this.targetForReq(req)
      .then((match) => {
        if (!match) {
          that.handleProxyError(404, kind, req, res);
          return;
        }

        if (kind === "web") {
          that.emit("proxyRequest", req, res);
        } else {
          that.emit("proxyRequestWs", req, res, args[2]);
        }
        var prefix = match.prefix;
        var target = match.target;
        that.log.debug("PROXY %s %s to %s", kind.toUpperCase(), _logUrl(req.url), target);
        if (!that.includePrefix) {
          req.url = req.url.slice(prefix.length);
        }

        target = URL.parse(target);
        if (that.options.clientSsl) {
          target.key = that.options.clientSsl.key;
          target.cert = that.options.clientSsl.cert;
          target.ca = that.options.clientSsl.ca;
        }

        // add config argument
        args.push({ target: target });

        // add error handling
        args.push(function (e) {
          that.handleProxyError(503, kind, req, res, e);
        });

        // dispatch the actual method, either:
        // - proxy.web(req, res, options, errorHandler)
        // - proxy.ws(req, socket, head, options, errorHandler)
        that.proxy[kind].apply(that.proxy, args);

        // update timestamp on any request/reply data as well (this includes websocket data)
        req.on("data", function () {
          that.updateLastActivity(prefix);
        });

        res.on("data", function () {
          that.updateLastActivity(prefix);
        });

        if (kind === "web") {
          // update last activity on completion of the request
          // only consider 'successful' requests activity
          // A flood of invalid requests such as 404s or 403s
          // or 503s because the endpoint is down
          // shouldn't make it look like the endpoint is 'active'

          // we no longer register activity at the *start* of the request
          // because at that point we don't know if the endpoint is even available
          res.on("finish", function () {
            // (don't count redirects...but should we?)
            if (res.statusCode < 300) {
              that.updateLastActivity(prefix);
            } else {
              that.log.debug("Not recording activity for status %s on %s", res.statusCode, prefix);
            }
          });
        }
      })
      .catch(function (e) {
        if (res.finished) throw e;
        that.handleProxyError(500, kind, req, res, e);
      });
  }

  handleProxyWs(req, socket, head) {
    // Proxy a websocket request
    this.metrics.requestsWsCount.inc();
    return this.handleProxy("ws", req, socket, head);
  }

  handleProxyWeb(req, res) {
    this.handleHealthCheck(req, res);
    if (res.finished) return;
    // Proxy a web request
    this.metrics.requestsWebCount.inc();
    return this.handleProxy("web", req, res);
  }

  handleHealthCheck(req, res) {
    if (req.url === "/_chp_healthz") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.write(JSON.stringify({ status: "OK" }));
      res.end();
    }
  }

  handleMetrics(req, res) {
    if (req.url === "/metrics") {
      return this.metrics.render(res);
    }
    fail(req, res, 404);
  }

  handleApiRequest(req, res) {
    // Handle a request to the REST API
    if (res) {
      res.on("finish", () => {
        this.metrics.requestsApiCount.labels(res.statusCode).inc();
        this.logResponse(req, res);
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
