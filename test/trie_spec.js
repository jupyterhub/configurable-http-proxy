// jshint jasmine: true
"use strict";

var URLTrie = require('../lib/trie').URLTrie;

describe("URLTrie", function () {
    
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

    it("trie_init", function (done) {
        var trie = new URLTrie();
        expect(trie.prefix).toEqual('/');
        expect(trie.size).toEqual(0);
        expect(trie.data).toBe(undefined);
        expect(trie.branches).toEqual({});
    
        trie = new URLTrie('/foo');
        expect(trie.size).toEqual(0);
        expect(trie.prefix).toEqual('/foo');
        expect(trie.data).toBe(undefined);
        expect(trie.branches).toEqual({});
    
        done();
    });

    it("trie_root", function (done) {
        var trie = new URLTrie();
        trie.add('/', -1);
        var node = trie.get('/1/etc/etc/');
        expect(node).toBeTruthy();
        expect(node.prefix).toEqual('/');
        expect(node.data).toEqual(-1);

        node = trie.get('/');
        expect(node).toBeTruthy();
        expect(node.prefix).toEqual('/');
        expect(node.data).toEqual(-1);

        node = trie.get('');
        expect(node).toBeTruthy();
        expect(node.prefix).toEqual('/');
        expect(node.data).toEqual(-1);
        done();
    });
    
    it("trie_add", function (done) {
        var trie = new URLTrie();
    
        trie.add('foo', 1);
        expect(trie.size).toEqual(1);
    
        expect(trie.data).toBe(undefined);
        expect(trie.branches.foo.data).toEqual(1);
        expect(trie.branches.foo.size).toEqual(0);

        trie.add('bar/leaf', 2);
        expect(trie.size).toEqual(2);
        var bar = trie.branches.bar;
        expect(bar.prefix).toEqual('/bar');
        expect(bar.size).toEqual(1);
        expect(bar.branches.leaf.data).toEqual(2);

        trie.add('/a/b/c/d', 4);
        expect(trie.size).toEqual(3);
        var a = trie.branches.a;
        expect(a.prefix).toEqual('/a');
        expect(a.size).toEqual(1);
        expect(a.data).toBe(undefined);

        var b = a.branches.b;
        expect(b.prefix).toEqual('/a/b');
        expect(b.size).toEqual(1);
        expect(b.data).toBe(undefined);

        var c = b.branches.c;
        expect(c.prefix).toEqual('/a/b/c');
        expect(c.size).toEqual(1);
        expect(c.data).toBe(undefined);
        var d = c.branches.d;
        expect(d.prefix).toEqual('/a/b/c/d');
        expect(d.size).toEqual(0);
        expect(d.data).toEqual(4);

        done();
    });

    it("trie_get", function (done) {
        var trie = full_trie();
        expect(trie.get('/not/found')).toBe(undefined);

        var node = trie.get('/1');
        expect(node.prefix).toEqual('/1');
        expect(node.data.path).toEqual('/1');

        node = trie.get('/1/etc/etc/');
        expect(node).toBeTruthy();
        expect(node.prefix).toEqual('/1');
        expect(node.data.path).toEqual('/1');

        expect(trie.get('/a')).toBe(undefined);
        expect(trie.get('/a/b/c')).toBe(undefined);

        node = trie.get('/a/b/c/d/e/f');
        expect(node).toBeTruthy();
        expect(node.prefix).toEqual('/a/b/c/d');
        expect(node.data.path).toEqual('/a/b/c/d');

        node = trie.get('/b/c/d/word');
        expect(node).toBeTruthy();
        expect(node.prefix).toEqual('/b/c/d');
        expect(node.data.path).toEqual('/b/c/d');

        node = trie.get('/b/c/dword');
        expect(node).toBeTruthy();
        expect(node.prefix).toEqual('/b/c');
        expect(node.data.path).toEqual('/b/c');

        done();
    });

    it("trie_remove", function (done) {
        var trie = full_trie();
        var size = trie.size;
        trie.remove('/b');
        expect(trie.size).toEqual(size - 1);
        expect(trie.get('/b/c/dword')).toBe(undefined);

        var node = trie.get('/a/b/c/d/word');
        expect(node.prefix).toEqual('/a/b/c/d');
        var b = trie.branches.a.branches.b;
        expect(b.size).toEqual(3);
        trie.remove('/a/b/c/d');
        expect(b.size).toEqual(2);
        expect(b.branches.c).toBe(undefined);
        
        trie.remove('/');
        node = trie.get('/');
        expect(node).toBe(undefined);

        done();
    });

    it("trie_sub_paths", function (done) {
        var trie = new URLTrie(), node;
        trie.add('/', {
            path: '/'
        });
        
        node = trie.get('/prefix/sub');
        expect(node).toBeTruthy();
        expect(node.prefix).toEqual('/');
        
        // add /prefix/sub/tree
        trie.add('/prefix/sub/tree', {});
        
        // which shouldn't change the results for /prefix and /prefix/sub
        node = trie.get('/prefix');
        expect(node).toBeTruthy();
        expect(node.prefix).toEqual('/');
        
        node = trie.get('/prefix/sub');
        expect(node).toBeTruthy();
        expect(node.prefix).toEqual('/');
        
        node = trie.get('/prefix/sub/tree');
        expect(node).toBeTruthy();
        expect(node.prefix).toEqual('/prefix/sub/tree');
        
        // add /prefix, and run one more time
        trie.add('/prefix', {});
        
        node = trie.get('/prefix');
        expect(node).toBeTruthy();
        expect(node.prefix).toEqual('/prefix');
        
        node = trie.get('/prefix/sub');
        expect(node).toBeTruthy();
        expect(node.prefix).toEqual('/prefix');
        
        node = trie.get('/prefix/sub/tree');
        expect(node).toBeTruthy();
        expect(node.prefix).toEqual('/prefix/sub/tree');
        
        done();
    });

    it("remove first leaf doesn't remove root", function (done) {
        var trie = new URLTrie(), node;
        trie.add('/', {
            path: '/'
        });
        
        node = trie.get('/prefix/sub');
        expect(node).toBeTruthy();
        expect(node.prefix).toEqual('/');

        trie.add('/prefix', {
            path: '/prefix'
        });

        node = trie.get('/prefix/sub');
        expect(node).toBeTruthy();
        expect(node.prefix).toEqual('/prefix');

        trie.remove('/prefix/');

        node = trie.get('/prefix/sub');
        expect(node).toBeTruthy();
        expect(node.prefix).toEqual('/');

        done();
    });
});
