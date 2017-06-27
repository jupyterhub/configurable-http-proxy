// jshint jasmine: true

var util = require('../lib/testutil');
var extend = require('util')._extend;
var request = require('request-promise-native');
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
        util.setup_proxy(port).then(function (new_proxy) {
            proxy = new_proxy;
        }).then(function () {
            r = request.defaults({
                method: 'GET',
                headers: {Authorization: 'token ' + proxy.auth_token},
                port: api_port,
                url: api_url,
            });
        }).then(function () {
            callback();
        });
    });

    afterEach(function (callback) {
        util.teardown_servers(callback);
    });
    

    it("Basic proxy constructor", function () {
        expect(proxy).toBeDefined();
        expect(proxy.default_target).toBe(undefined);

        return proxy.target_for_req({ url: "/" })
        .then(function (route) {
            expect(route).toEqual({
                prefix: "/",
                target: "http://127.0.0.1:" + (port + 2)
            });
        });
    });

    it("Default target is used for /any/random/url", function (done) {
        proxy.target_for_req({ url: "/any/random/url" }).then(function (target) {
            expect(target).toEqual({
                prefix: "/",
                target: "http://127.0.0.1:" + (port + 2)
            });

            done();
        });
    });

    it("Default target is used for /", function (done) {
        proxy.target_for_req({ url: "/" }).then(function (target) {
            expect(target).toEqual({
                prefix: "/",
                target: "http://127.0.0.1:" + (port + 2)
            });

            done();
        });
    });

    it("GET /api/routes fetches the routing table", function (done) {
        r(api_url)
        .then(function (body) {
            var reply = JSON.parse(body);
            var keys = Object.keys(reply);
            expect(keys.length).toEqual(1);
            expect(keys).toContain('/');
        }).then(done);
    });

    it("GET /api/routes[/path] fetches a single route", function (done) {
        var path = '/path';
        var url = 'https://127.0.0.1:54321';
        proxy.add_route(path, { target: url })
        .then(function () {
            return r(api_url + path);
        }).then(function (body) {
            var reply = JSON.parse(body);
            var keys = Object.keys(reply);
            expect(keys).toContain('target');
            expect(reply.target).toEqual(url);
        }).then(done);
    });

    it("GET /api/routes[/path] fetches a single route (404 if missing)", function (done) {
        r(api_url + '/path')
        .then((body) => {
            done.fail("Expected a 404");
        }).catch((error) => {
            expect(error.statusCode).toEqual(404);
        }).then(done);
    });

    it("POST /api/routes[/path] creates a new route", function (done) {
        var port = 8998;
        var target = 'http://127.0.0.1:' + port;

        r.post({
            url: api_url + '/user/foo',
            body: JSON.stringify({target: target}),
        })
        .then((body) => {
            expect(body).toEqual('');
        })
        .then(() => proxy._routes.get('/user/foo'))
        .then( (route) => {
            expect(route.target).toEqual(target);
            expect(typeof route.last_activity).toEqual('object');
        }).then(done);
    });

    it("POST /api/routes[/foo%20bar] handles URI escapes", function (done) {
        var port = 8998;
        var target = 'http://127.0.0.1:' + port;
        r.post({
            url: api_url + '/user/foo%40bar',
            body: JSON.stringify({target: target}),
        }).then((body) => {
            expect(body).toEqual('');
        }).then(() => proxy._routes.get('/user/foo@bar'))
        .then((route) => {
            expect(route.target).toEqual(target);
            expect(typeof route.last_activity).toEqual('object');
        })
        .then(() => proxy.target_for_req({ url: "/user/foo@bar/path" }))
        .then((proxy_target) => {
            expect(proxy_target.target).toEqual(target);
        }).then(done);
    });

    it("POST /api/routes creates a new root route", function (done) {
        var port = 8998;
        var target = 'http://127.0.0.1:' + port;
        r.post({
            url: api_url,
            body: JSON.stringify({target: target}),
        }).then((body) => {
            expect(body).toEqual('');
            return proxy._routes.get("/");
        }).then((route) => {
            expect(route.target).toEqual(target);
            expect(typeof route.last_activity).toEqual('object');
            done();
        });
    });


    it("DELETE /api/routes[/path] deletes a route", function (done) {
        var port = 8998;
        var target = 'http://127.0.0.1:' + port;
        var path = '/user/bar';

        util.add_target(proxy, path, port, null, null)
        .then(() => proxy._routes.get(path))
        .then((route) => expect(route.target).toEqual(target))
        .then(() => r.del(api_url + path))
        .then((body) => expect(body).toEqual(''))
        .then(() => proxy._routes.get(path))
        .then((deleted_route) => expect(deleted_route).toBe(undefined))
        .then(done);
    });

    it("GET /api/routes?inactive_since= with bad value returns a 400", function (done) {
        r.get(api_url + "?inactive_since=endoftheuniverse")
        .then(() => done.fail("Expected 400"))
        .catch((err) => expect(err.statusCode).toEqual(400))
        .then(done);
    });

    it("GET /api/routes?inactive_since= filters inactive entries", function (done) {
        var port = 8998;
        var path = '/yesterday';

        var now = new Date();
        var yesterday = new Date(now.getTime() - (24 * 3.6e6));
        var long_ago = new Date(1);
        var hour_ago = new Date(now.getTime() - 3.6e6);
        var hour_from_now = new Date(now.getTime() + 3.6e6);

        var tests = [
            {
                name: 'long ago',
                since: long_ago,
                expected: {}
            },
            {
                name: 'an hour ago',
                since: hour_ago,
                expected: {'/yesterday': true}
            },
            {
                name: 'the future',
                since: hour_from_now,
                expected: {
                    '/yesterday': true,
                    '/today': true
                }
            }
        ];

        var seen = 0;
        var do_req = function (i) {
            var t = tests[i];
            return r.get(api_url + '?inactive_since=' + t.since.toISOString())
            .then(function (body) {
                var routes        = JSON.parse(body);
                var route_keys    = Object.keys(routes);
                var expected_keys = Object.keys(t.expected);

                route_keys.forEach(function (key) {
                    // check that all routes are expected
                    expect(expected_keys).toContain(key);
                });

                expected_keys.forEach(function (key) {
                    // check that all expected routes are found
                    expect(route_keys).toContain(key);
                });

                seen += 1;
                if (seen === tests.length) {
                    done();
                } else {
                    return do_req(seen);
                }
            });
        };

        proxy.remove_route("/").then(
            () => util.add_target(proxy, '/yesterday', port, null, null)
        ).then(
            () => util.add_target(proxy, '/today', port + 1, null, null)
        ).then(
            () => proxy._routes.update('/yesterday', { last_activity: yesterday })
        ).then(
            () => do_req(0)
        ).then();
    });
});
