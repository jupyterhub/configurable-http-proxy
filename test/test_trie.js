// jshint node: true
"use strict";

var assert = require('assert');
var http = require('http');
var util = require('../lib/testutil');
var URLTrie = require('../lib/trie').URLTrie;

var port = 8902;
var api_port = port + 1;
var proxy;
var api_url = "http://127.0.0.1:" + api_port + '/api/routes';

exports.setUp = function(callback) {
    proxy = util.setup_proxy(port, callback);
};

exports.tearDown = util.teardown_servers;

var full_trie = function () {
    // return a simple trie for testing
    var trie = new URLTrie();
    var paths = [
        '/1',
        '/2',
        '/a/b/c/d',
        '/a/b/d',
        '/a/b/e',
        '/b/c',
        '/b/c/d',
    ];
    for (var i=0; i < paths.length; i++) {
        var path = paths[i];
        trie.add(path, {path: path});
    }
    return trie;
};

exports.test_trie_init = function (test) {
    var trie = new URLTrie();
    test.equal(trie.prefix, '');
    test.equal(trie.size, 0);
    test.equal(trie.data, undefined);
    test.deepEqual(trie.branches, {});
    
    trie = new URLTrie('/foo');
    test.equal(trie.size, 0);
    test.equal(trie.prefix, '/foo');
    test.deepEqual(trie.data, undefined);
    test.deepEqual(trie.branches, {});
    
    test.done();
};

exports.test_trie_add = function (test) {
    var trie = new URLTrie();
    
    trie.add('foo', 1);
    test.equal(trie.size, 1);
    
    test.equal(trie.data, undefined);
    test.equal(trie.branches.foo.data, 1);
    test.equal(trie.branches.foo.size, 0);

    trie.add('bar/leaf', 2);
    test.equal(trie.size, 2);
    var bar = trie.branches.bar;
    test.equal(bar.prefix, '/bar');
    test.equal(bar.size, 1);
    test.equal(bar.branches.leaf.data, 2);

    trie.add('/a/b/c/d', 4);
    test.equal(trie.size, 3);
    var a = trie.branches.a;
    test.equal(a.prefix, '/a');
    test.equal(a.size, 1);
    test.deepEqual(a.data, undefined);

    var b = a.branches.b;
    test.equal(b.prefix, '/a/b');
    test.equal(b.size, 1);
    test.equal(b.data, undefined);

    var c = b.branches.c;
    test.equal(c.prefix, '/a/b/c');
    test.equal(c.size, 1);
    test.deepEqual(c.data, undefined);
    var d = c.branches.d;
    test.equal(d.prefix, '/a/b/c/d');
    test.equal(d.size, 0);
    test.equal(d.data, 4);

    test.done();
};

exports.test_trie_get = function (test) {
    var trie = full_trie();
    test.equal(trie.get('/not/found'), undefined);

    var node = trie.get('/1');
    test.equal(node.prefix, '/1');
    test.equal(node.data.path, '/1');

    node = trie.get('/1/etc/etc/');
    test.ok(node);
    test.equal(node.prefix, '/1');
    test.equal(node.data.path, '/1');

    test.deepEqual(trie.get('/a'), undefined);
    test.deepEqual(trie.get('/a/b/c'), undefined);

    node = trie.get('/a/b/c/d/e/f');
    test.ok(node);
    test.equal(node.prefix, '/a/b/c/d');
    test.equal(node.data.path, '/a/b/c/d');

    node = trie.get('/b/c/d/word');
    test.ok(node);
    test.equal(node.prefix, '/b/c/d');
    test.equal(node.data.path, '/b/c/d');

    node = trie.get('/b/c/dword');
    test.ok(node);
    test.equal(node.prefix, '/b/c');
    test.equal(node.data.path, '/b/c');

    test.done();
};

exports.test_trie_remove = function (test) {
    var trie = full_trie();
    var size = trie.size;
    trie.remove('/b');
    test.equal(trie.size, size - 1);
    test.equal(trie.get('/b/c/dword'), undefined);

    var node = trie.get('/a/b/c/d/word');
    test.equal(node.prefix, '/a/b/c/d');
    var b = trie.branches.a.branches.b;
    test.equal(b.size, 3);
    trie.remove('/a/b/c/d');
    test.equal(b.size, 2);
    test.equal(b.branches.c, undefined);

    test.done();
};

