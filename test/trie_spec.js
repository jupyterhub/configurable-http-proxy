// jshint expr: true
// jshint mocha: true

var expect = require('chai').expect;

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
        expect(trie.prefix).to.equal('/');
        expect(trie.size).to.equal(0);
        expect(trie.data).to.be.undefined;
        expect(trie.branches).to.deep.equal({});

        trie = new URLTrie('/foo');
        expect(trie.size).to.equal(0);
        expect(trie.prefix).to.equal('/foo');
        expect(trie.data).to.be.undefined;
        expect(trie.branches).to.deep.equal({});

        done();
    });

    it("trie_root", function (done) {
        var trie = new URLTrie();
        trie.add('/', -1);
        var node = trie.get('/1/etc/etc/');
        expect(node).to.be.ok;
        expect(node.prefix).to.equal('/');
        expect(node.data).to.equal(-1);

        node = trie.get('/');
        expect(node).to.be.ok;
        expect(node.prefix).to.equal('/');
        expect(node.data).to.equal(-1);

        node = trie.get('');
        expect(node).to.be.ok;
        expect(node.prefix).to.equal('/');
        expect(node.data).to.equal(-1);
        done();
    });

    it("trie_add", function (done) {
        var trie = new URLTrie();

        trie.add('foo', 1);
        expect(trie.size).to.equal(1);

        expect(trie.data).to.be.undefined;
        expect(trie.branches.foo.data).to.equal(1);
        expect(trie.branches.foo.size).to.equal(0);

        trie.add('bar/leaf', 2);
        expect(trie.size).to.equal(2);
        var bar = trie.branches.bar;
        expect(bar.prefix).to.equal('/bar');
        expect(bar.size).to.equal(1);
        expect(bar.branches.leaf.data).to.equal(2);

        trie.add('/a/b/c/d', 4);
        expect(trie.size).to.equal(3);
        var a = trie.branches.a;
        expect(a.prefix).to.equal('/a');
        expect(a.size).to.equal(1);
        expect(a.data).to.be.undefined;

        var b = a.branches.b;
        expect(b.prefix).to.equal('/a/b');
        expect(b.size).to.equal(1);
        expect(b.data).to.be.undefined;

        var c = b.branches.c;
        expect(c.prefix).to.equal('/a/b/c');
        expect(c.size).to.equal(1);
        expect(c.data).to.be.undefined;
        var d = c.branches.d;
        expect(d.prefix).to.equal('/a/b/c/d');
        expect(d.size).to.equal(0);
        expect(d.data).to.equal(4);

        done();
    });

    it("trie_get", function (done) {
        var trie = full_trie();
        expect(trie.get('/not/found')).to.be.undefined;

        var node = trie.get('/1');
        expect(node.prefix).to.equal('/1');
        expect(node.data.path).to.equal('/1');

        node = trie.get('/1/etc/etc/');
        expect(node).to.be.ok;
        expect(node.prefix).to.equal('/1');
        expect(node.data.path).to.equal('/1');

        expect(trie.get('/a')).to.be.undefined;
        expect(trie.get('/a/b/c')).to.be.undefined;

        node = trie.get('/a/b/c/d/e/f');
        expect(node).to.be.ok;
        expect(node.prefix).to.equal('/a/b/c/d');
        expect(node.data.path).to.equal('/a/b/c/d');

        node = trie.get('/b/c/d/word');
        expect(node).to.be.ok;
        expect(node.prefix).to.equal('/b/c/d');
        expect(node.data.path).to.equal('/b/c/d');

        node = trie.get('/b/c/dword');
        expect(node).to.be.ok;
        expect(node.prefix).to.equal('/b/c');
        expect(node.data.path).to.equal('/b/c');

        done();
    });

    it("trie_remove", function (done) {
        var trie = full_trie();
        var size = trie.size;
        trie.remove('/b');
        expect(trie.size).to.equal(size - 1);
        expect(trie.get('/b/c/dword')).to.be.undefined;

        var node = trie.get('/a/b/c/d/word');
        expect(node.prefix).to.equal('/a/b/c/d');
        var b = trie.branches.a.branches.b;
        expect(b.size).to.equal(3);
        trie.remove('/a/b/c/d');
        expect(b.size).to.equal(2);
        expect(b.branches.c).to.be.undefined;

        trie.remove('/');
        node = trie.get('/');
        expect(node).to.be.undefined;

        done();
    });

    it("trie_sub_paths", function (done) {
        var trie = new URLTrie(), node;
        trie.add('/', {
            path: '/'
        });

        node = trie.get('/prefix/sub');
        expect(node).to.be.ok;
        expect(node.prefix).to.equal('/');

        // add /prefix/sub/tree
        trie.add('/prefix/sub/tree', {});

        // which shouldn't change the results for /prefix and /prefix/sub
        node = trie.get('/prefix');
        expect(node).to.be.ok;
        expect(node.prefix).to.equal('/');

        node = trie.get('/prefix/sub');
        expect(node).to.be.ok;
        expect(node.prefix).to.equal('/');

        node = trie.get('/prefix/sub/tree');
        expect(node).to.be.ok;
        expect(node.prefix).to.equal('/prefix/sub/tree');

        // add /prefix, and run one more time
        trie.add('/prefix', {});

        node = trie.get('/prefix');
        expect(node).to.be.ok;
        expect(node.prefix).to.equal('/prefix');

        node = trie.get('/prefix/sub');
        expect(node).to.be.ok;
        expect(node.prefix).to.equal('/prefix');

        node = trie.get('/prefix/sub/tree');
        expect(node).to.be.ok;
        expect(node.prefix).to.equal('/prefix/sub/tree');

        done();
    });

    it("remove first leaf doesn't remove root", function (done) {
        var trie = new URLTrie(), node;
        trie.add('/', {
            path: '/'
        });

        node = trie.get('/prefix/sub');
        expect(node).to.be.ok;
        expect(node.prefix).to.equal('/');

        trie.add('/prefix', {
            path: '/prefix'
        });

        node = trie.get('/prefix/sub');
        expect(node).to.be.ok;
        expect(node.prefix).to.equal('/prefix');

        trie.remove('/prefix/');

        node = trie.get('/prefix/sub');
        expect(node).to.be.ok;
        expect(node.prefix).to.equal('/');

        done();
    });
});
