// jshint jasmine: true

var path = require('path');
var util = require('../lib/testutil');
var request = require('request-promise-native');
var WebSocket = require('ws');

var ConfigurableProxy = require('../lib/configproxy').ConfigurableProxy;

describe("Proxy Tests", function () {
    "use strict";
    var port = 8902;
    var test_port = port + 10;
    var proxy;
    var proxy_url = "http://127.0.0.1:" + port;
    var host_test = "test.127.0.0.1.xip.io";
    var host_url = "http://" + host_test + ":" + port;

    var r = request.defaults({
        method: 'GET',
        url: proxy_url,
        followRedirect: false,
    });

    beforeEach(function (callback) {
        util.setup_proxy(port).then(function (new_proxy) {
            proxy = new_proxy;
            callback();
        });
    });

    afterEach(function (callback) {
        util.teardown_servers(callback);
    });

    it("basic HTTP request", function (done) {
        r(proxy_url)
        .then((body) => {
            body = JSON.parse(body);
            expect(body).toEqual(jasmine.objectContaining({
                path: '/',
            }));
            done();
        });
    });

    it("basic WebSocker request", function (done) {
        var ws = new WebSocket('ws://127.0.0.1:' + port);
        ws.on('error', function () {
            // jasmine fail is only in master
            expect('error').toEqual('ok');
            done();
        });
        var nmsgs = 0;
        ws.on('message', function (msg) {
            if (nmsgs === 0) {
                expect(msg).toEqual('connected');
            } else {
                msg = JSON.parse(msg);
                expect(msg).toEqual(jasmine.objectContaining({
                    path: '/',
                    message: 'hi'
                }));
                ws.close();
                done();
            }
            nmsgs++;
        });
        ws.on('open', function () {
            ws.send('hi');
        });
    });

    it("proxy_request event can modify headers", function (done) {
        var called = {};
        proxy.on('proxy_request', function (req, res) {
            req.headers.testing = 'Test Passed';
            called.proxy_request = true;
        });

        r(proxy_url)
        .then(function (body) {
            body = JSON.parse(body);
            expect(called.proxy_request).toBe(true);
            expect(body).toEqual(jasmine.objectContaining({
                path: '/',
            }));
            expect(body.headers).toEqual(jasmine.objectContaining({
                testing: 'Test Passed',
            }));
        }).then(done);
    });

    it("target path is prepended by default", function (done) {
        util.add_target(proxy, '/bar', test_port, false, '/foo')
        .then(() => r(proxy_url + '/bar/rest/of/it'))
        .then((body) => {
            body = JSON.parse(body);
            expect(body).toEqual(jasmine.objectContaining({
                path: '/bar',
                url: '/foo/bar/rest/of/it'
            }));
            done();
        });
    });

    it("handle URI encoding", function (done) {
        util.add_target(proxy, '/b@r/b r', test_port, false, '/foo')
        .then(() => r(proxy_url + '/b%40r/b%20r/rest/of/it'))
        .then((body) => {
            body = JSON.parse(body);
            expect(body).toEqual(jasmine.objectContaining({
                path: '/b@r/b r',
                url: '/foo/b%40r/b%20r/rest/of/it'
            }));
            done();
        });
    });

    it("handle @ in URI same as %40", function (done) {
        util.add_target(proxy, '/b@r/b r', test_port, false, '/foo')
        .then(() => r(proxy_url + '/b@r/b%20r/rest/of/it'))
        .then((body) => {
            body = JSON.parse(body);
            expect(body).toEqual(jasmine.objectContaining({
                path: '/b@r/b r',
                url: '/foo/b@r/b%20r/rest/of/it'
            }));
            done();
        });
    });

    it("prependPath: false prevents target path from being prepended", function (done) {
        proxy.proxy.options.prependPath = false;
        util.add_target(proxy, '/bar', test_port, false, '/foo')
        .then(() => r(proxy_url + '/bar/rest/of/it'))
        .then((body) => {
            body = JSON.parse(body);
            expect(body).toEqual(jasmine.objectContaining({
                path: '/bar',
                url: '/bar/rest/of/it'
            }));
            done();
        });
    });

    it("includePrefix: false strips routing prefix from request",function (done) {
        proxy.includePrefix = false;
        util.add_target(proxy, '/bar', test_port, false, '/foo')
        .then(() => r(proxy_url + '/bar/rest/of/it'))
        .then((body) => {
            body = JSON.parse(body);
            expect(body).toEqual(jasmine.objectContaining({
                path: '/bar',
                url: '/foo/rest/of/it'
            }));
            done();
        });
    });

    it('options.default_target', function (done) {
      var options = {
        default_target: 'http://127.0.0.1:9001',
      };

      var cp = new ConfigurableProxy(options);
      cp._routes.get("/").then(function (route) {
          expect(route.target).toEqual("http://127.0.0.1:9001");
          done();
      });
    });

    it("includePrefix: false + prependPath: false", function (done) {
        proxy.includePrefix = false;
        proxy.proxy.options.prependPath = false;
        util.add_target(proxy, '/bar', test_port, false, '/foo')
        .then(() => r(proxy_url + '/bar/rest/of/it'))
        .then((body) => {
            body = JSON.parse(body);
            expect(body).toEqual(jasmine.objectContaining({
                path: '/bar',
                url: '/rest/of/it'
            }));
            done();
        });
    });

    it("hostRouting: routes by host", function(done) {
        proxy.host_routing = true;
        util.add_target(proxy, '/' + host_test, test_port, false, null)
        .then(() => r(host_url + '/some/path'))
        .then((body) => {
            body = JSON.parse(body);
            expect(body).toEqual(jasmine.objectContaining({
                target: "http://127.0.0.1:" + test_port,
                url: '/some/path'
            }));
        }).then(done);
    });

    it("custom error target", function (done) {
        var port = 55555;
        util.setup_proxy(port, { error_target: "http://127.0.0.1:55565" }, [])
        .then(() => r('http://127.0.0.1:' + port + '/foo/bar'))
        .then((body) => done.fail("Expected 404"))
        .catch((err) => {
            expect(err.statusCode).toEqual(404);
            expect(err.response.headers['content-type']).toEqual('text/plain');
            expect(err.response.body).toEqual('/foo/bar');
        }).then(done);
    });

    it("custom error path", function (done) {
        proxy.error_path = path.join(__dirname, 'error');
        proxy.remove_route('/')
        .then(() => proxy.add_route('/missing', { target: 'https://127.0.0.1:54321' }))
        .then(() => r(host_url + '/nope'))
        .then((body) => done.fail("Expected 404"))
        .catch((err) => {
            expect(err.statusCode).toEqual(404);
            expect(err.response.headers['content-type']).toEqual('text/html');
            expect(err.response.body).toMatch(/404'D/);
        }).then(() => r(host_url + '/missing/prefix'))
        .then((body) => done.fail("Expected 503"))
        .catch((err) => {
            expect(err.statusCode).toEqual(503);
            expect(err.response.headers['content-type']).toEqual('text/html');
            expect(err.response.body).toMatch(/UNKNOWN/);
        }).then(done);
    });

    it("default error html", function (done) {
        proxy.remove_route('/');
        proxy.add_route('/missing', { target: 'https://127.0.0.1:54321' })
        .then(() => r(host_url + '/nope'))
        .then((body) => done.fail("Expected 404"))
        .catch((err) => {
            expect(err.statusCode).toEqual(404);
            expect(err.response.headers['content-type']).toEqual('text/html');
            expect(err.response.body).toMatch(/404:/);
        }).then(() => r(host_url + '/missing/prefix'))
        .then((body) => done.fail("Expected 503"))
        .catch((err) => {
            expect(err.statusCode).toEqual(503);
            expect(err.response.headers['content-type']).toEqual('text/html');
            expect(err.response.body).toMatch(/503:/);
        }).then(done);
    });

    it("Redirect location untouched without rewrite options", function (done) {
        var redirect_to = 'http://foo.com:12345/whatever';
        util.add_target_redirecting(proxy, '/external/urlpath/', test_port, '/internal/urlpath/', redirect_to)
        .then(() => r(proxy_url + '/external/urlpath/rest/of/it'))
        .then((body) => done.fail("Expected 301"))
        .catch((err) => {
            expect(err.statusCode).toEqual(301);
            expect(err.response.headers.location).toEqual(redirect_to);
        }).then(done);
    });

    it("Redirect location with rewriting", function (done) {
        var proxy_port = 55555;
        var options = {
            protocolRewrite: "https",
            autoRewrite: true,
        };

        // where the backend server redirects us.
        // Note that http-proxy requires (logically) the redirection to be to the same (internal) host.
        var redirect_to = "https://127.0.0.1:"+test_port+"/whatever";
        var expected_redirect = "https://127.0.0.1:"+proxy_port+"/whatever";

        util.setup_proxy(proxy_port, options, [])
        .then((proxy) => util.add_target_redirecting(proxy, '/external/urlpath/', test_port, '/internal/urlpath/', redirect_to))
        .then(() => r('http://127.0.0.1:' + proxy_port + '/external/urlpath/'))
        .then((body) => done.fail("Expected 301"))
        .catch((err) => {
            expect(err.statusCode).toEqual(301);
            expect(err.response.headers.location).toEqual(expected_redirect);
        }).then(done);

    });
});
