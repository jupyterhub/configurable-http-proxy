// A Configurable node-http-proxy
//
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
//
// POST, DELETE to /api/routes[:/path/to/proxy] to update the routing table
// GET /api/routes to see the current routing table
//

var http = require('http'),
    https = require('https'),
    fs = require('fs'),
    path = require('path'),
    EventEmitter = require('events').EventEmitter,
    httpProxy = require('http-proxy'),
    log = require('winston'),
    util = require('util'),
    URL = require('url'),
    querystring = require('querystring'),
    store = require('./store.js');

function bound (that, method) {
    // bind a method, to ensure `this=that` when it is called
    // because prototype languages are bad
    return function () {
        method.apply(that, arguments);
    };
}

function arguments_array (args) {
    // cast arguments object to array, because Javascript.
    return Array.prototype.slice.call(args, 0);
}

function fail (req, res, code, msg) {
    // log a failure, and finish the HTTP request with an error code
    msg = msg || '';
    log.error("%s %s %s %s", code, req.method, req.url, msg);
    if (res.writeHead) res.writeHead(code);
    if (res.write) {
        if (!msg) {
            msg = http.STATUS_CODES[code];
        }
        res.write(msg);
    }
    if (res.end) res.end();
}

function json_handler (handler) {
    // wrap json handler, so the handler is called with parsed data,
    // rather than implementing streaming parsing in the handler itself
    return function (req, res) {
        var args = arguments_array(arguments);
        var buf = '';
        req.on('data', function (chunk) {
            buf += chunk;
        });
        req.on('end', function () {
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

function authorized (method) {
    // decorator for token-authorized handlers
    return function (req, res) {
        if (!this.auth_token) {
            return method.apply(this, arguments);
        }
        var match = (req.headers.authorization || '').match(/token\s+(\S+)/);
        var token;
        if (match !== null) {
            token = match[1];
        }
        if (token === this.auth_token) {
            return method.apply(this, arguments);
        } else {
            res.writeHead(403);
            res.end();
        }
    };
}

function parse_host (req) {
    var host = req.headers.host;
    if (host) {
        host = host.split(':')[0];
    }
    return host;
}

function ConfigurableProxy (options) {
    var that = this;
    this.options = options || {};

    this._routes = store.MemoryStore();
    this.auth_token = this.options.auth_token;
    this.includePrefix = options.includePrefix === undefined ? true : options.includePrefix;
    this.host_routing = this.options.host_routing;
    this.error_target = options.error_target;
    if (this.error_target && this.error_target.slice(-1) !== '/') {
        this.error_target = this.error_target + '/'; // ensure trailing /
    }
    this.error_path = options.error_path || path.join(__dirname, 'error');
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
                    stop: function() {}
                };
            }
        };
    }

    if (this.options.default_target) {
        this.add_route('/', {
            target: this.options.default_target
        });
    }
    options.ws = true;
    var proxy = this.proxy = httpProxy.createProxyServer(options);

    // tornado-style regex routing,
    // because cross-language cargo-culting is always a good idea

    this.api_handlers = [
        [ /^\/api\/routes(\/.*)?$/, {
            get : bound(this, authorized(this.get_routes)),
            post : json_handler(bound(this, authorized(this.post_routes))),
            'delete' : bound(this, authorized(this.delete_routes))
        } ]
    ];

    var log_errors = function (handler) {
        return function (req, res) {
            try {
                return handler.apply(that, arguments);
            } catch (e) {
                log.error("Error in handler for " +
                    req.method + ' ' + req.url + ': ', e
                );
            }
        };
    };

    // handle API requests
    var api_callback = log_errors(that.handle_api_request);
    if ( this.options.api_ssl ) {
        this.api_server = https.createServer(this.options.api_ssl, api_callback);
    } else {
        this.api_server = http.createServer(api_callback);
    }

    // proxy requests separately
    var proxy_callback = log_errors(this.handle_proxy_web);
    if ( this.options.ssl ) {
        this.proxy_server = https.createServer(this.options.ssl, proxy_callback);
    } else {
        this.proxy_server = http.createServer(proxy_callback);
    }
    // proxy websockets
    this.proxy_server.on('upgrade', bound(this, this.handle_proxy_ws));

    this.proxy.on('proxyRes', function (proxyRes, req, res) {
        that.statsd.increment('requests.' + proxyRes.statusCode, 1);
    });
}

util.inherits(ConfigurableProxy, EventEmitter);

ConfigurableProxy.prototype.add_route = function (path, data, cb) {
    // add a route to the routing table
    path = this._routes.cleanPath(path);
    if (this.host_routing && path !== '/') {
        data.host = path.split('/')[1];
    }

    var that = this;

    this._routes.add(path, data, function () {
      that.update_last_activity(path, function () {
        if (typeof(cb) === "function") {
          cb();
        }
      });
    });
};

ConfigurableProxy.prototype.remove_route = function (path, cb) {
    // remove a route from the routing table
    var routes = this._routes;

    routes.hasRoute(path, function (result) {
        if (result) {
            routes.remove(path, cb);
        }
    });
};

ConfigurableProxy.prototype.get_routes = function (req, res) {
    // GET returns routing table as JSON dict
    var that = this;
    var parsed = URL.parse(req.url);
    var inactive_since = null;
    if (parsed.query) {
        var query = querystring.parse(parsed.query);

        if (query.inactive_since !== undefined) {
            var timestamp = Date.parse(query.inactive_since);
            if (isFinite(timestamp)) {
                inactive_since = new Date(timestamp);
            } else {
                fail(req, res, 400, "Invalid datestamp '" + query.inactive_since + "' must be ISO8601.");
                return;
            }
        }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });

    this._routes.getAll(function (routes) {
        var results = {};

        if (inactive_since) {
            Object.keys(routes).forEach(function (path) {
                if (routes[path].last_activity < inactive_since) {
                    results[path] = routes[path];
                }
            });
        } else {
            results = routes;
        }

        res.write(JSON.stringify(results));
        res.end();
        that.statsd.increment('api.route.get', 1);
    });
};

ConfigurableProxy.prototype.post_routes = function (req, res, path, data) {
    // POST adds a new route
    path = path || '/';
    log.debug('POST', path, data);

    if (typeof data.target !== 'string') {
        log.warn("Bad POST data: %s", JSON.stringify(data));
        fail(req, res, 400, "Must specify 'target' as string");
        return;
    }

    var that = this;
    this.add_route(path, data, function () {
        res.writeHead(201);
        res.end();
        that.statsd.increment('api.route.add', 1);
    });
};

ConfigurableProxy.prototype.delete_routes = function (req, res, path) {
    // DELETE removes an existing route
    log.debug('DELETE', path);

    var that = this;
    this._routes.hasRoute(path, function (result) {
        if (result) {
            that.remove_route(path, function () {
                res.writeHead(204);
                res.end();
                that.statsd.increment('api.route.delete', 1);
            });
        } else {
            res.writeHead(404);
            res.end();
            that.statsd.increment('api.route.delete', 1);
        }
    });
};

ConfigurableProxy.prototype.target_for_req = function (req, cb) {
    var timer = this.statsd.createTimer('find_target_for_req');
    // return proxy target for a given url path
    var base_path = (this.host_routing) ? '/' + parse_host(req) : '';

    this._routes.getTarget(base_path + decodeURIComponent(req.url), function (route) {
        timer.stop();
        if (route) {
            cb({
                prefix: route.prefix,
                target: route.data.target
            });
            return;
        }

        cb(null);
    });
};

ConfigurableProxy.prototype.update_last_activity = function (prefix, cb) {
    var timer = this.statsd.createTimer('last_activity_updating');
    var routes = this._routes;

    routes.hasRoute(prefix, function (result) {
        cb = cb || function() {};

        if (result) {
            routes.update(prefix, { "last_activity": new Date() }, function () {
                timer.stop();
                cb();
            });
        } else {
            timer.stop();
            cb();
        }
    });
};

ConfigurableProxy.prototype._handle_proxy_error_default = function (code, kind, req, res) {
    // called when no custom error handler is registered,
    // or is registered and doesn't work
    if (res.writeHead) res.writeHead(code);
    if (res.write) res.write(http.STATUS_CODES[code]);
    if (res.end) res.end();
};

ConfigurableProxy.prototype.handle_proxy_error = function (code, kind, req, res) {
    // called when proxy itself has an error
    // so far, just 404 for no target and 503 for target not responding
    // custom error server gets `/CODE?url=/escaped_url/`, e.g.
    // /404?url=%2Fuser%2Ffoo

    var proxy = this;
    log.error("%s %s %s", code, req.method, req.url);
    this.statsd.increment('requests.' + code, 1);
    if (this.error_target) {
        var url_spec = URL.parse(this.error_target);
        url_spec.search = '?' + querystring.encode({url: req.url});
        url_spec.pathname = url_spec.pathname + code.toString();
        var url = URL.format(url_spec);
        var error_request = http.request(url, function (upstream) {
            ['content-type', 'content-encoding'].map(function (key) {
                if (!upstream.headers[key]) return;
                res.setHeader(key, upstream.headers[key]);
            });
            if (res.writeHead) res.writeHead(code);
            upstream.on('data', function (data) {
                if (res.write) res.write(data);
            });
            upstream.on('end', function () {
                if (res.end) res.end();
            });
        });
        error_request.on('error', function(e) {
            // custom error failed, fallback on default
            log.error("Failed to get custom error page", e);
            proxy._handle_proxy_error_default(code, kind, req, res);
        });
        error_request.end();
    } else if (this.error_path) {
        var filename = path.join(this.error_path, code.toString() + '.html');
        if (!fs.existsSync(filename)) {
            log.debug("No error file %s", filename);
            filename = path.join(this.error_path, 'error.html');
            if (!fs.existsSync(filename)) {
                log.error("No error file %s", filename);
                proxy._handle_proxy_error_default(code, kind, req, res);
                return;
            }
        }
        fs.readFile(filename, function (err, data) {
            if (err) {
                log.error("Error reading %s %s", filename, err);
                proxy._handle_proxy_error_default(code, kind, req, res);
                return;
            }
            if (res.writeHead) res.writeHead(code, {'Content-Type': 'text/html'});
            if (res.write) res.write(data);
            if (res.end) res.end();
        });
    } else {
        this._handle_proxy_error_default(code, kind, req, res);
    }
};

ConfigurableProxy.prototype.handle_proxy = function (kind, req, res) {
    // proxy any request
    var that = this;
    var args = Array.prototype.slice.call(arguments, 1);

    // get the proxy target
    this.target_for_req(req, function (match) {
        if (!match) {
            that.handle_proxy_error(404, kind, req, res);
            return;
        }

        that.emit("proxy_request", req, res);
        var prefix = match.prefix;
        var target = match.target;
        log.debug("PROXY", kind.toUpperCase(), req.url, "to", target);
        if (!that.includePrefix) {
            req.url = req.url.slice(prefix.length);
        }

        // add config argument
        args.push({ target: target });

        // add error handling
        args.push(function (e) {
            log.error("Proxy error: ", e);
            that.handle_proxy_error(503, kind, req, res);
        });

        // update timestamp on any reply data as well (this includes websocket data)
        req.on('data', function () {
            that.update_last_activity(prefix);
        });

        res.on('data', function () {
            that.update_last_activity(prefix);
        });

        // update last activity timestamp in routing table
        that.update_last_activity(prefix, function () {
            // dispatch the actual method
            that.proxy[kind].apply(that.proxy, args);
        });
    });
};

ConfigurableProxy.prototype.handle_proxy_ws = function (req, res, head) {
    // Proxy a websocket request
    this.statsd.increment('requests.ws', 1);
    return this.handle_proxy('ws', req, res, head);
};

ConfigurableProxy.prototype.handle_proxy_web = function (req, res) {
    // Proxy a web request
    this.statsd.increment('requests.web', 1);
    return this.handle_proxy('web', req, res);
};

ConfigurableProxy.prototype.handle_api_request = function (req, res) {
    // Handle a request to the REST API
    this.statsd.increment('requests.api', 1);
    var args = [req, res];
    function push_path_arg (arg) {
        args.push(arg === undefined ? arg : decodeURIComponent(arg));
    }
    for (var i = 0; i < this.api_handlers.length; i++) {
        var pat = this.api_handlers[i][0];
        var match = pat.exec(URL.parse(req.url).pathname);
        if (match) {
            var handlers = this.api_handlers[i][1];
            var handler = handlers[req.method.toLowerCase()];
            if (!handler) {
                // 405 on found resource, but not found method
                fail(req, res, 405, "Method not supported.");
                return;
            }
            match.slice(1).forEach(push_path_arg);
            handler.apply(handler, args);
            return;
        }
    }
    fail(req, res, 404);
};

exports.ConfigurableProxy = ConfigurableProxy;
