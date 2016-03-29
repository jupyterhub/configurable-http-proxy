// jshint jasmine: true
"use strict";

var util = require('../lib/testutil');
var extend = require('util')._extend;
var request = require('request');
var log = require('winston');
// disable logging during tests
log.remove(log.transports.Console);

describe("API Tests", function () {
    var port = 8902;
    var api_port = port + 1;
    var proxy;
    var api_url = "http://127.0.0.1:" + api_port + '/api/routes';
    
    var r;
    
    beforeEach(function (callback) {
        function setup_r() {
            r = request.defaults({
                method: 'GET',
                headers: {Authorization: 'token ' + proxy.auth_token},
                port: api_port,
                url: api_url,
            });
            callback();
        }
        proxy = util.setup_proxy(port, setup_r);
    });
    
    afterEach(function (callback) {
        util.teardown_servers(callback);
    });
    
    it("Basic proxy constructor", function () {
        expect(proxy).toBeDefined();
        expect(proxy.default_target).toBe(undefined);
        expect(proxy.target_for_req({url: '/'})).toEqual({
            prefix: '/',
            target: "http://127.0.0.1:" + (port + 2)
        });
    });
    
    it("Default target is used for /any/random/url", function () {
        var target = proxy.target_for_req({url: '/any/random/url'});
        expect(target).toEqual({
            prefix: '/',
            target: "http://127.0.0.1:" + (port + 2)
        });
    });
    
    it("Default target is used for /", function () {
        var target = proxy.target_for_req({url: '/'});
        expect(target).toEqual({
            prefix: '/',
            target: "http://127.0.0.1:" + (port + 2)
        });
    });
    
    it("GET /api/routes fetches the routing table", function (done) {
        r(api_url, function (error, res, body) {
            expect(error).toBe(null);
            expect(res.statusCode).toEqual(200);
            body = JSON.parse(res.body);
            var keys = Object.keys(body);
            expect(keys.length).toEqual(1);
            expect(keys).toContain('/');
            done();
        });
    });
    
    it("POST /api/routes[/path] creates a new route", function (done) {
        var port = 8998;
        var target = 'http://127.0.0.1:' + port;
        r.post({
            url: api_url + '/user/foo',
            body: JSON.stringify({target: target}),
        }, function (error, res, body) {
            expect(error).toBe(null);
            expect(res.statusCode).toEqual(201);
            expect(res.body).toEqual('');
            var route = proxy.routes['/user/foo'];
            expect(route.target).toEqual(target);
            expect(typeof route.last_activity).toEqual('object');
            done();
        });
    });
    
    it("POST /api/routes[/foo%20bar] handles URI escapes", function (done) {
        var port = 8998;
        var target = 'http://127.0.0.1:' + port;
        r.post({
            url: api_url + '/user/foo%40bar',
            body: JSON.stringify({target: target}),
        }, function (error, res, body) {
            expect(error).toBe(null);
            expect(res.statusCode).toEqual(201);
            expect(res.body).toEqual('');
            var route = proxy.routes['/user/foo@bar'];
            expect(route.target).toEqual(target);
            expect(typeof route.last_activity).toEqual('object');
            route = proxy.target_for_req({url: '/user/foo@bar/path'});
            expect(route.target).toEqual(target);
            done();
        });
    });
    
    it("POST /api/routes creates a new root route", function (done) {
        var port = 8998;
        var target = 'http://127.0.0.1:' + port;
        r.post({
            url: api_url,
            body: JSON.stringify({target: target}),
        }, function (error, res, body) {
            expect(error).toBe(null);
            expect(res.statusCode).toEqual(201);
            expect(res.body).toEqual('');
            var route = proxy.routes['/'];
            expect(route.target).toEqual(target);
            expect(typeof route.last_activity).toEqual('object');
            done();
        });
    });
    
    it("DELETE /api/routes[/path] deletes a route", function (done) {
        var port = 8998;
        var target = 'http://127.0.0.1:' + port;
        var path = '/user/bar';
        util.add_target(proxy, path, port);
        expect(proxy.routes[path].target).toEqual(target);
        r.del(api_url + path, function (error, res, body) {
            expect(error).toBe(null);
            expect(res.statusCode).toEqual(204);
            expect(res.body).toEqual('');
            expect(proxy.routes[path]).toBe(undefined);
            done();
        });
    });
    
    it("GET /api/routes?inactive_since= filters inactive entries", function (done) {
        var port = 8998;
        var path = '/yesterday';
        util.add_target(proxy, '/yesterday', port);
        util.add_target(proxy, '/today', port+1);
    
        var now = new Date();
        var yesterday = new Date(now.getTime() - (24 * 3.6e6));
        var long_ago = new Date(1);
        var hour_ago = new Date(now.getTime() - 3.6e6);
        var hour_from_now = new Date(now.getTime() + 3.6e6);
        
        proxy.remove_route('/');
        
        proxy.routes['/yesterday'].last_activity = yesterday;
    
        var tests = [
            {
                name: 'long ago',
                since: long_ago,
                expected: {},
            },
            {
                name: 'an hour ago',
                since: hour_ago,
                expected: {'/yesterday': true},
            },
            {
                name: 'the future',
                since: hour_from_now,
                expected: {
                    '/yesterday': true,
                    '/today': true
                },
            },
        ];
        
        r.get(api_url + "?inactive_since=endoftheuniverse", function (error, res, body) {
            expect(error).toBe(null);
            expect(res.statusCode).toEqual(400);
        });
    
        var seen = 0;
        var do_req = function (i) {
            var t = tests[i];
            r.get(api_url + '?inactive_since=' + t.since.toISOString(), function (error, res, body) {
                expect(error).toBe(null);
                expect(res.statusCode).toEqual(200);
                var routes = JSON.parse(res.body);
                var route_keys = Object.keys(routes);
                var expected_keys = Object.keys(t.expected);
                var key;
                Object.keys(routes).map(function (key) {
                    // check that all routes are expected
                    expect(expected_keys).toContain(key);
                });
                Object.keys(t.expected).map(function (key) {
                    // check that all expected routes are found
                    expect(route_keys).toContain(key);
                    expect(routes[key].last_activity).toEqual(
                        proxy.routes[key].last_activity.toISOString()
                    );
                });
                seen += 1;
                if (seen === tests.length) {
                    done();
                } else {
                    do_req(seen);
                }
            });
        };
    
        do_req(0);
    });
});