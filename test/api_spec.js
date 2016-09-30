// jshint jasmine: true

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

        util.setup_proxy(port, function (new_proxy) {
            proxy = new_proxy;
            setup_r();
        });
    });

    afterEach(function (callback) {
        util.teardown_servers(callback);
    });

    it("Basic proxy constructor", function (done) {
        expect(proxy).toBeDefined();
        expect(proxy.default_target).toBe(undefined);

        proxy.target_for_req({ url: "/" }, function (route) {
            expect(route).toEqual({
                prefix: "/",
                target: "http://127.0.0.1:" + (port + 2)
            });

            done();
        });
    });

    it("Default target is used for /any/random/url", function (done) {
        proxy.target_for_req({ url: "/any/random/url" }, function (target) {
            expect(target).toEqual({
                prefix: "/",
                target: "http://127.0.0.1:" + (port + 2)
            });

            done();
        });
    });

    it("Default target is used for /", function (done) {
        proxy.target_for_req({ url: "/" }, function (target) {
            expect(target).toEqual({
                prefix: "/",
                target: "http://127.0.0.1:" + (port + 2)
            });

            done();
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

            proxy._routes.get('/user/foo', function (route) {
                expect(route.target).toEqual(target);
                expect(typeof route.last_activity).toEqual('object');
                done();
            });
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

            proxy._routes.get('/user/foo@bar', function (route) {
                expect(route.target).toEqual(target);
                expect(typeof route.last_activity).toEqual('object');

                proxy.target_for_req({ url: "/user/foo@bar/path" }, function (proxy_target) {
                    expect(proxy_target.target).toEqual(target);
                    done();
                });
            });
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

            proxy._routes.get("/", function (route) {
                expect(route.target).toEqual(target);
                expect(typeof route.last_activity).toEqual('object');
                done();
            });
        });
    });

    it("DELETE /api/routes[/path] deletes a route", function (done) {
        var port = 8998;
        var target = 'http://127.0.0.1:' + port;
        var path = '/user/bar';

        util.add_target(proxy, path, port, null, null, function () {
            proxy._routes.get(path, function (route) {
                expect(route.target).toEqual(target);

                r.del(api_url + path, function (error, res, body) {
                    expect(error).toBe(null);
                    expect(res.statusCode).toEqual(204);
                    expect(res.body).toEqual('');

                    proxy._routes.get(path, function (deleted_route) {
                        expect(deleted_route).toBe(undefined);
                        done();
                    });
                });
            });
        });
    });

    it("GET /api/routes?inactive_since= with bad value returns a 400", function (done) {
        r.get(api_url + "?inactive_since=endoftheuniverse", function (error, res, body) {
            expect(error).toBe(null);
            expect(res.statusCode).toEqual(400);
            done();
        });
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
            r.get(api_url + '?inactive_since=' + t.since.toISOString(), function (error, res, body) {
                expect(error).toBe(null);
                expect(res.statusCode).toEqual(200);

                var routes        = JSON.parse(res.body);
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
                    do_req(seen);
                }
            });
        };

        proxy.remove_route("/", function () {
            util.add_target(proxy, '/yesterday', port, null, null, function () {
                util.add_target(proxy, '/today', port + 1, null, null, function () {
                    proxy._routes.update('/yesterday', { last_activity: yesterday }, function () {
                        do_req(0);
                    });
                });
            });
        });
    });
});
