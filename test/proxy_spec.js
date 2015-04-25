// jshint node: true
"use strict";

var util = require('../lib/testutil');
var request = require('request');
var WebSocket = require('ws');

describe("Proxy Tests", function () {
    var port = 8902;
    var test_port = port + 10;
    var proxy;
    var proxy_url = "http://127.0.0.1:" + port;
    var host_test = "test.127.0.0.1.xip.io";
    var host_url = "http://" + host_test + ":" + port;

    var r;
    
    beforeEach(function (callback) {
        proxy = util.setup_proxy(port, callback);
        r = request.defaults({
            method: 'GET',
            url: proxy_url,
        });
    });
    
    afterEach(function (callback) {
        util.teardown_servers(callback);
    });
    
    it("basic HTTP request", function (done) {
        r(proxy_url, function (error, res, body) {
            expect(res.statusCode).toEqual(200);
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
    
    it("target path is prepended by default", function (done) {
        util.add_target(proxy, '/bar', test_port, false, '/foo');
        r(proxy_url + '/bar/rest/of/it', function (error, res, body) {
            expect(res.statusCode).toEqual(200);
            body = JSON.parse(body);
            expect(body).toEqual(jasmine.objectContaining({
                path: '/bar',
                url: '/foo/bar/rest/of/it'
            }));
            done();
        });
    });
    
    it("prependPath: false prevents target path from being prepended", function (done) {
        proxy.proxy.options.prependPath = false;
        util.add_target(proxy, '/bar', test_port, false, '/foo');
        r(proxy_url + '/bar/rest/of/it', function (error, res, body) {
            expect(res.statusCode).toEqual(200);
            body = JSON.parse(body);
            expect(body).toEqual(jasmine.objectContaining({
                path: '/bar',
                url: '/bar/rest/of/it'
            }));
            done();
        });
    });
    
    it("includePrefix: false strips routing prefix from request", function (done) {
        proxy.includePrefix = false;
        util.add_target(proxy, '/bar', test_port, false, '/foo');
        r(proxy_url + '/bar/rest/of/it', function (error, res, body) {
            expect(res.statusCode).toEqual(200);
            body = JSON.parse(body);
            expect(body).toEqual(jasmine.objectContaining({
                path: '/bar',
                url: '/foo/rest/of/it'
            }));
            done();
        });
    });
    
    it("includePrefix: false + prependPath: false", function (done) {
        proxy.includePrefix = false;
        proxy.proxy.options.prependPath = false;
        util.add_target(proxy, '/bar', test_port, false, '/foo');
        r(proxy_url + '/bar/rest/of/it', function (error, res, body) {
            expect(res.statusCode).toEqual(200);
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
        util.add_target(proxy, '/' + host_test, test_port, false);
        r(host_url + '/some/path', function(error, res, body) {
            expect(res.statusCode).toEqual(200);
            body = JSON.parse(body);
            expect(body).toEqual(jasmine.objectContaining({
                target: "http://127.0.0.1:" + test_port,
                url: '/some/path'
            }));
            done();
        });

    });
});