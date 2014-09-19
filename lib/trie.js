// A simple trie for URL prefix matching
//
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
//
// Store data at nodes in the trie with Trie.add("/path/", {data})
//
// Get data for a prefix with Trie.get("/path/to/something/inside")
//
// jshint node: true
"use strict";

var URLTrie = function (prefix) {
    this.prefix = prefix || '';
    this.children = {};
    this.leaves = {};
    this.size = 0;
};

var _slashes_re = /^[\/]+|[\/]+$/g;
var string_to_path = function (s) {
    // console.log("s, '%s'", s);
    return s.replace(_slashes_re, "").split('/');
};

URLTrie.prototype.add = function (path, data) {
    // add data to a node in the trie at path
    if (typeof path === 'string') {
        path = string_to_path(path);
    }
    var part = path.shift();
    if (path.length === 0) {
        this.leaves[part] = data;
        this.size += 1;
        return;
    }
    if (!this.children.hasOwnProperty(part)) {
        this.children[part] = new URLTrie(this.prefix + '/' + part);
        this.size += 1;
    }
    this.children[part].add(path, data);
};

URLTrie.prototype.remove = function (path) {
    // remove `path` from the trie
    if (typeof path === 'string') {
        path = string_to_path(path);
    }
    var part = path.shift();
    if (path.length === 0) {
        delete this.leaves[part];
        this.size -= 1;
        return;
    }
    var child = this.children[part];
    child.remove(path);
    if (child.size === 0) {
        delete this.children[part];
        this.size -= 1;
    }
};

URLTrie.prototype.get = function (path) {
    // get the data stored at a matching prefix
    // returns: 
    // {
    //  prefix: "/the/matching/prefix",
    //  data: {whatever: "was stored by add"}
    // }
    if (typeof path === 'string') {
        path = string_to_path(path);
    }
    var part = path.shift();
    if (path.length === 0) {
        return this.leaves[part];
    }
    var child = this.children[part];
    if (child === undefined) {
        return {
            prefix: this.prefix,
            data: this.leaves[part],
        };
    } else {
        return child.get(path);
    }
};

exports.URLTrie = URLTrie;