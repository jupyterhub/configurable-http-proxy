// jshint node: true
"use strict";

var assert = require('assert');
var http = require('http');
var util = require('../lib/testutil');

var port = 8902;
var api_port = port + 1;
var proxy;
var api_url = "http://127.0.0.1:" + api_port + '/api/routes';

exports.setUp = function(callback) {
    proxy = util.setup_proxy(port, callback);
};

exports.tearDown = util.teardown_servers;

exports.test_rest_get = function (test) {
    test.expect(2);
    
    var req = http.get({
        port: api_port,
        path: '/api/routes',
        headers: {Authorization: 'token ' + proxy.auth_token},
    }, function (res) {
        util.onfinish(res, function () {
            test.equal(res.statusCode, 200);
            test.equal(res.body, '{}');
            test.done();
        });
    });
    req.end();
};

exports.test_rest_post = function (test) {
    test.expect(4);
    var target = 'http://localhost:8002';
    var req = http.request({
        method: 'POST',
        port: api_port,
        path: '/api/routes/user/foo',
        headers: {Authorization: 'token ' + proxy.auth_token},
        }, function (res) {
        util.onfinish(res, function () {
            test.equal(res.statusCode, 201);
            test.equal(res.body, '');
            var route = proxy.routes['/user/foo'];
            test.equal(route.target, target);
            test.equal(typeof route.last_activity, 'object');
            test.done();
        });
    });
    req.write(JSON.stringify({target: target}));
    req.end();
};

exports.test_rest_delete = function (test) {
    test.expect(4);
    var port = 8998;
    var target = 'http://127.0.0.1:' + port;
    var path = '/user/bar';
    util.add_target(proxy, path, port);
    test.equal(proxy.routes[path].target, target);
    var req = http.request({
        method: 'DELETE',
        port: api_port,
        path: '/api/routes' + path,
        headers: {Authorization: 'token ' + proxy.auth_token},
        }, function (res) {
        util.onfinish(res, function () {
            test.equal(res.statusCode, 204);
            test.equal(res.body, '');
            var route = proxy.routes[path];
            test.equal(route, undefined);
            test.done();
        });
    });
    req.end();
};

exports.test_get_inactive_since = function (test) {
    test.expect(13);
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
    
    var req = http.request({
        method: 'GET',
        port: api_port,
        path: '/api/routes?inactive_since=endoftheuniverse',
        headers: {Authorization: 'token ' + proxy.auth_token},
        }, function (res) {
        util.onfinish(res, function () {
            test.equal(res.statusCode, 400);
        });
    });
    
    req.end();
    
    var seen = 0;
    var do_req = function (i) {
        var t = tests[i];
        var req = http.request({
            method: 'GET',
            port: api_port,
            path: '/api/routes?inactive_since=' + t.since.toISOString(),
            headers: {Authorization: 'token ' + proxy.auth_token},
            }, function (res) {
            util.onfinish(res, function () {
                test.equal(res.statusCode, 200);
                var routes = JSON.parse(res.body);
                var key;
                for (key in routes) {
                    test.ok(t.expected[key], "Didn't expect " + key + " since " + t.name);
                }
                for (key in t.expected) {
                    test.ok(routes.hasOwnProperty(key), "Didn't find " + key + " since " + t.name);
                    test.equal(
                        routes[key].last_activity,
                        proxy.routes[key].last_activity.toISOString()
                    );
                }
                seen += 1;
                if (seen === tests.length) {
                    test.done();
                } else {
                    do_req(seen);
                }
            });
        });
        req.end();
    };
    
    do_req(0);
};
