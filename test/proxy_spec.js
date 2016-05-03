// jshint expr: true
// jshint mocha: true

var chai = require('chai');
var expect = chai.expect;
var chaiSubset = require('chai-subset');
chai.use(chaiSubset);

var path = require('path');
var request = require('request');
var WebSocket = require('ws');

var util = require('../lib/testutil');
var ConfigurableProxy = require('../lib/configproxy').ConfigurableProxy;


describe("Proxy Tests", function () {
    var port = 8902;
    var test_port = port + 10;
    var proxy;
    var proxy_url = "http://127.0.0.1:" + port;
    var host_test = "test.127.0.0.1.xip.io";
    var host_url = "http://" + host_test + ":" + port;

    var r = request.defaults({
        method: 'GET',
        url: proxy_url,
    });

    beforeEach(function (callback) {
        proxy = util.setup_proxy(port, function (proxy) { callback(); } );
    });

    afterEach(function (callback) {
        util.teardown_servers(callback);
    });

    it("basic HTTP request", function (done) {
        r(proxy_url, function (error, res, body) {
            expect(error).to.be.null;
            expect(res.statusCode).to.equal(200);
            body = JSON.parse(body);
            expect(body).to.containSubset({
                path: '/',
            });
            done();
        });
    });

    it("basic WebSocker request", function (done) {
        var ws = new WebSocket('ws://127.0.0.1:' + port);
        ws.on('error', function () {
            // jasmine fail is only in master
            expect('error').to.equal('ok');
            done();
        });
        var nmsgs = 0;
        ws.on('message', function (msg) {
            if (nmsgs === 0) {
                expect(msg).to.equal('connected');
            } else {
                msg = JSON.parse(msg);
                expect(msg).to.containSubset({
                    path: '/',
                    message: 'hi'
                });
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

        r(proxy_url, function (error, res, body) {
            expect(error).to.be.null;
            expect(res.statusCode).to.equal(200);
            body = JSON.parse(body);
            expect(called.proxy_request).to.be.true;
            expect(body).to.containSubset({
                path: '/',
            });
            expect(body.headers).to.containSubset({
                testing: 'Test Passed',
            });

            done();
        });
    });

    it("target path is prepended by default", function (done) {
        util.add_target(proxy, '/bar', test_port, false, '/foo');
        r(proxy_url + '/bar/rest/of/it', function (error, res, body) {
            expect(error).to.be.null;
            expect(res.statusCode).to.equal(200);
            body = JSON.parse(body);
            expect(body).to.containSubset({
                path: '/bar',
                url: '/foo/bar/rest/of/it'
            });
            done();
        });
    });

    it("handle URI encoding", function (done) {
        util.add_target(proxy, '/b@r/b r', test_port, false, '/foo');
        r(proxy_url + '/b%40r/b%20r/rest/of/it', function (error, res, body) {
            expect(error).to.be.null;
            expect(res.statusCode).to.equal(200);
            body = JSON.parse(body);
            expect(body).to.containSubset({
                path: '/b@r/b r',
                url: '/foo/b%40r/b%20r/rest/of/it'
            });
            done();
        });
    });

    it("handle @ in URI same as %40", function (done) {
        util.add_target(proxy, '/b@r/b r', test_port, false, '/foo');
        r(proxy_url + '/b@r/b%20r/rest/of/it', function (error, res, body) {
            expect(error).to.be.null;
            expect(res.statusCode).to.equal(200);
            body = JSON.parse(body);
            expect(body).to.containSubset({
                path: '/b@r/b r',
                url: '/foo/b@r/b%20r/rest/of/it'
            });
            done();
        });
    });

    it("prependPath: false prevents target path from being prepended", function (done) {
        proxy.proxy.options.prependPath = false;
        util.add_target(proxy, '/bar', test_port, false, '/foo');
        r(proxy_url + '/bar/rest/of/it', function (error, res, body) {
            expect(error).to.be.null;
            expect(res.statusCode).to.equal(200);
            body = JSON.parse(body);
            expect(body).to.containSubset({
                path: '/bar',
                url: '/bar/rest/of/it'
            });
            done();
        });
    });

    it("includePrefix: false strips routing prefix from request", function (done) {
        proxy.includePrefix = false;
        util.add_target(proxy, '/bar', test_port, false, '/foo');
        r(proxy_url + '/bar/rest/of/it', function (error, res, body) {
            expect(error).to.be.null;
            expect(res.statusCode).to.equal(200);
            body = JSON.parse(body);
            expect(body).to.containSubset({
                path: '/bar',
                url: '/foo/rest/of/it'
            });
            done();
        });
    });

    it('options.default_target', function () {
      var options = {
        default_target: 'http://127.0.0.1:9001',
      };

      var cp = new ConfigurableProxy(options);
      expect(cp.routes['/'].target).to.equal('http://127.0.0.1:9001');
    });

    it("includePrefix: false + prependPath: false", function (done) {
        proxy.includePrefix = false;
        proxy.proxy.options.prependPath = false;
        util.add_target(proxy, '/bar', test_port, false, '/foo');
        r(proxy_url + '/bar/rest/of/it', function (error, res, body) {
            expect(error).to.be.null;
            expect(res.statusCode).to.equal(200);
            body = JSON.parse(body);
            expect(body).to.containSubset({
                path: '/bar',
                url: '/rest/of/it'
            });
            done();
        });
    });

    it("hostRouting: routes by host", function(done) {
        proxy.host_routing = true;
        util.add_target(proxy, '/' + host_test, test_port, false);
        r(host_url + '/some/path', function(error, res, body) {
            expect(error).to.be.null;
            expect(res.statusCode).to.equal(200);
            body = JSON.parse(body);
            expect(body).to.containSubset({
                target: "http://127.0.0.1:" + test_port,
                url: '/some/path'
            });
            done();
        });
    });

    it("custom error target", function (done) {
        var port = 55555;
        util.setup_proxy(port, function (proxy) {
            var url = 'http://127.0.0.1:' + port + '/foo/bar';
            r(url, function (error, res, body) {
                expect(error).to.be.null;
                expect(res.statusCode).to.equal(404);
                expect(res.headers['content-type']).to.equal('text/plain');
                expect(body).to.equal('/foo/bar');
                done();
            });
        }, {
            error_target: 'http://127.0.0.1:55565'
        }, []);
    });

    it("custom error path", function (done) {
        proxy.remove_route('/');
        proxy.add_route('/missing', {
            target: 'https://127.0.0.1:54321',
        });
        proxy.error_path = path.join(__dirname, 'error');
        r(host_url + '/nope', function (error, res, body) {
            expect(error).to.be.null;
            expect(res.statusCode).to.equal(404);
            expect(res.headers['content-type']).to.equal('text/html');
            expect(body).to.match(/404'D/);
            r(host_url + '/missing/prefix', function (error, res, body) {
                expect(error).to.be.null;
                expect(res.statusCode).to.equal(503);
                expect(res.headers['content-type']).to.equal('text/html');
                expect(body).to.match(/UNKNOWN/);
                done();
            });
        });
    });

    it("default error html", function (done) {
        proxy.remove_route('/');
        proxy.add_route('/missing', {
            target: 'https://127.0.0.1:54321',
        });

        r(host_url + '/nope', function (error, res, body) {
            expect(error).to.be.null;
            expect(res.statusCode).to.equal(404);
            expect(res.headers['content-type']).to.equal('text/html');
            expect(body).to.match(/404:/);
            r(host_url + '/missing/prefix', function (error, res, body) {
                expect(res.statusCode).to.equal(503);
                expect(res.headers['content-type']).to.equal('text/html');
                expect(body).to.match(/503:/);
                done();
            });
        });
    });
});
