// jshint node: true
"use strict";

var util = require('../lib/testutil');
var extend = require('util')._extend;
var request = require('request');

describe("API Tests", function () {
    var port = 8902;
    var api_port = port + 1;
    var proxy;
    var api_url = "http://127.0.0.1:" + api_port + '/api/routes';
    
    var r;
    
    beforeEach(function (callback) {
        proxy = util.setup_proxy(port, callback);
        r = request.defaults({
            method: 'GET',
            headers: {Authorization: 'token ' + proxy.auth_token},
            port: api_port,
            url: api_url,
        });
    });
    
    afterEach(function (callback) {
        util.teardown_servers(callback);
    });
    
    it("Basic constructor", function () {
        expect(proxy).toBeDefined();
    });
    
    it("REST GET", function (done) {
        r(api_url, function (error, res, body) {
            // console.log(arguments);
            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual('{}');
            done();
        });
    });
    
    it("REST POST", function (done) {
        var port = 8998;
        var target = 'http://127.0.0.1:' + port;
        r.post({
            url: api_url + '/user/foo',
            body: JSON.stringify({target: target}),
        }, function (error, res, body) {
            expect(res.statusCode).toEqual(201);
            expect(res.body).toEqual('');
            var route = proxy.routes['/user/foo'];
            expect(route.target).toEqual(target);
            expect(typeof route.last_activity).toEqual('object');
            done();
        });
    });
    
    it("REST DELETE", function (done) {
        var port = 8998;
        var target = 'http://127.0.0.1:' + port;
        var path = '/user/bar';
        util.add_target(proxy, path, port);
        expect(proxy.routes[path].target).toEqual(target);
        r.del(api_url + path, function (error, res, body) {
            expect(res.statusCode).toEqual(204);
            expect(res.body).toEqual('');
            expect(proxy.routes[path]).toBe(undefined);
            done();
        });
    });
    
    it("GET inactive_since?", function (done) {
        var port = 8998;
        var path = '/yesterday';
        util.add_target(proxy, '/yesterday', port);
        util.add_target(proxy, '/today', port+1);
    
        var now = new Date();
        var yesterday = new Date(now.getTime() - (24 * 3.6e6));
        var long_ago = new Date(1);
        var hour_ago = new Date(now.getTime() - 3.6e6);
        var hour_from_now = new Date(now.getTime() + 3.6e6);
    
    
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
        
        r.get(api_url + "?inactive_since=endoftheuniverse", function (err, res, body) {
            expect(res.statusCode).toEqual(400);
        });
    
        var seen = 0;
        var do_req = function (i) {
            var t = tests[i];
            r.get(api_url + '?inactive_since=' + t.since.toISOString(), function (err, res, body) {
                expect(res.statusCode).toEqual(200);
                var routes = JSON.parse(res.body);
                var route_keys = Object.keys(routes);
                var expected_keys = Object.keys(t.expected);
                var key;
                for (key in routes) {
                    // check that all routes are expected
                    expect(expected_keys).toContain(key);
                }
                for (key in t.expected) {
                    // check that all expected routes are found
                    expect(route_keys).toContain(key);
                    expect(routes[key].last_activity).toEqual(
                        proxy.routes[key].last_activity.toISOString()
                    );
                }
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