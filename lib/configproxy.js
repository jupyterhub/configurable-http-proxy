// A Configurable node-http-proxy
// 
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
//
// POST, DELETE to /api/routes[:/path/to/proxy] to update the routing table
// GET /api/routes to see the current routing table
//
// jshint node: true
"use strict";

var http = require('http'),
    https = require('https'),
    httpProxy = require('http-proxy'),
    log = require('winston'),
    util = require('util'),
    parse_url = require('url').parse,
    parse_query = require('querystring').parse,
    trie = require('./trie.js');

var bound = function (that, method) {
    // bind a method, to ensure `this=that` when it is called
    // because prototype languages are bad
    return function () {
        method.apply(that, arguments);
    };
};

var arguments_array = function (args) {
    // cast arguments object to array, because Javascript.
    return Array.prototype.slice.call(args, 0);
};

var fail = function (req, res, code, msg) {
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
};

var json_handler = function (handler) {
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
};

var authorized = function (method) {
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
        if (token == this.auth_token) {
            return method.apply(this, arguments);
        } else {
            res.writeHead(403);
            res.end();
        }
    };
};

var ConfigurableProxy = function (options) {
    var that = this;
    this.options = options || {};
    this.trie = new trie.URLTrie();
    this.auth_token = this.options.auth_token;
    this.includePrefix = options.includePrefix === undefined ? true : options.includePrefix;
    this.routes = {};
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
    
    var log_errors = function(handler) {
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
    var proxy_callback = log_errors(that.handle_proxy_web);
    if ( this.options.ssl ) {
        this.proxy_server = https.createServer(this.options.ssl, proxy_callback);
    } else {
        this.proxy_server = http.createServer(proxy_callback);
    }
    // proxy websockets
    this.proxy_server.on('upgrade', bound(this, this.handle_proxy_ws));
};

ConfigurableProxy.prototype.add_route = function (path, data) {
    // add a route to the routing table
    path = trie.trim_prefix(path);
    this.routes[path] = data;
    this.trie.add(path, data);
    this.update_last_activity(path);
};

ConfigurableProxy.prototype.remove_route = function (path) {
    // remove a route from teh routing table
    if (this.routes[path] !== undefined) {
        delete this.routes[path];
        this.trie.remove(path);
    }
};

ConfigurableProxy.prototype.get_routes = function (req, res) {
    // GET returns routing table as JSON dict
    var parsed = parse_url(req.url);
    var inactive_since = null;
    if (parsed.query) {
        var query = parse_query(parsed.query);
        if (query.hasOwnProperty('inactive_since')) {
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
    var routes = {};
    if (inactive_since) {
        for (var path in this.routes) {
            var route = this.routes[path];
            if (route.last_activity < inactive_since) {
                routes[path] = route;
            }
        }
    } else {
        routes = this.routes;
    }
    res.write(JSON.stringify(routes));
    res.end();
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
    
    this.add_route(path, data);
    res.writeHead(201);
    res.end();
};

ConfigurableProxy.prototype.delete_routes = function (req, res, path) {
    // DELETE removes an existing route
    log.debug('DELETE', path);
    if (this.routes[path] === undefined) {
        res.writeHead(404);
    } else {
        this.remove_route(path);
        res.writeHead(204);
    }
    res.end();
};

ConfigurableProxy.prototype.target_for_url = function (url) {
    // return proxy target for a given url path
    var route = this.trie.get(url);
    if (route) {
        return {
            prefix: route.prefix,
            target: route.data.target,
        };
    }
};

ConfigurableProxy.prototype.update_last_activity = function (prefix) {
    // note last activity in routing table
    if (this.routes[prefix] !== undefined) {
        // route may have been deleted with open connections
        this.routes[prefix].last_activity = new Date();
    }
};

ConfigurableProxy.prototype.handle_proxy = function (kind, req, res) {
    // proxy any request
    var that = this;
    // get the proxy target
    var match = this.target_for_url(req.url);
    if (!match) {
        fail(req, res, 404);
        return;
    }
    var prefix = match.prefix;
    var target = match.target;
    log.debug("PROXY", kind.toUpperCase(), req.url, "to", target);
    if (!this.includePrefix) {
        req.url = req.url.slice(prefix.length);
    }
    
    // pop method off the front
    var args = arguments_array(arguments);
    args.shift();
    
    // add config argument
    args.push({
        target: target
    });
    
    // add error handling
    args.push(function (e) {
        log.error("Proxy error: ", e);
        if (res.writeHead) res.writeHead(502);
        if (res.write) res.write("Proxy target missing");
        if (res.end) res.end();
    });
    
    // update last activity timestamp in routing table
    this.update_last_activity(prefix);
    
    // update timestamp on any reply data as well (this includes websocket data)
    req.on('data', function () {
        that.update_last_activity(prefix);
    });
    res.on('data', function () {
        that.update_last_activity(prefix);
    });
    
    // dispatch the actual method
    this.proxy[kind].apply(this.proxy, args);
};

ConfigurableProxy.prototype.handle_proxy_ws = function (req, res, head) {
    // Proxy a websocket request
    return this.handle_proxy('ws', req, res, head);
};

ConfigurableProxy.prototype.handle_proxy_web = function (req, res) {
    // Proxy a web request
    return this.handle_proxy('web', req, res);
};

ConfigurableProxy.prototype.handle_api_request = function (req, res) {
    // Handle a request to the REST API
    var args = [req, res];
    var push_arg = function (arg) {
        args.push(arg);
    };
    for (var i = 0; i < this.api_handlers.length; i++) {
        var pat = this.api_handlers[i][0];
        var match = pat.exec(parse_url(req.url).pathname);
        if (match) {
            var handlers = this.api_handlers[i][1];
            var handler = handlers[req.method.toLowerCase()];
            if (!handler) {
                // 405 on found resource, but not found method
                fail(req, res, 405, "Method not supported.");
                return;
            }
            match.slice(1).forEach(push_arg);
            handler.apply(handler, args);
            return;
        }
    }
    fail(req, res, 404);
};

exports.ConfigurableProxy = ConfigurableProxy;
