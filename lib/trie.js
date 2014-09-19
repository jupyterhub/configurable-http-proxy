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
    this.branches = {};
    this.size = 0;
};

var _slashes_re = /^[\/]+|[\/]+$/g;
var string_to_path = function (s) {
    return s.replace(_slashes_re, "").split('/');
};

URLTrie.prototype.add = function (path, data) {
    // add data to a node in the trie at path
    if (typeof path === 'string') {
        path = string_to_path(path);
    }
    if (path.length === 0) {
        this.data = data;
        return;
    }
    var part = path.shift();
    if (!this.branches.hasOwnProperty(part)) {
        this.branches[part] = new URLTrie(this.prefix + '/' + part);
        this.size += 1;
    }
    this.branches[part].add(path, data);
};

URLTrie.prototype.remove = function (path) {
    // remove `path` from the trie
    if (typeof path === 'string') {
        path = string_to_path(path);
    }
    var part = path.shift();
    if (path.length === 0) {
        delete this.branches[part];
        this.size -= 1;
        return;
    }
    var child = this.branches[part];
    child.remove(path);
    if (child.size === 0 && child.data === undefined) {
        // child has no branches and is not a leaf
        delete this.branches[part];
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
    if (path.length === 0) {
        return this.data === undefined ? undefined: this;
    }
    var part = path.shift();
    var child = this.branches[part];
    if (child === undefined) {
        return this.data === undefined ? undefined: this;
    } else {
        return child.get(path);
    }
};

exports.URLTrie = URLTrie;
