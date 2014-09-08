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
            route = proxy.routes['/user/foo'];
            test.equal(route.target, target);
            test.equal(typeof route.last_activity, 'object');
            test.done();
        });
    });
    req.write(JSON.stringify({target: 'http://localhost:8002'}));
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
            route = proxy.routes[path];
            test.equal(route, undefined);
            test.done();
        });
    });
    req.end();
};
