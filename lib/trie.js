// A simple trie for URL prefix matching
//
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
//
// Store data at nodes in the trie with Trie.add("/path/", {data})
//
// Get data for a prefix with Trie.get("/path/to/something/inside")
//

export function trimPrefix(prefix) {
  // cleanup prefix form: /foo/bar
  // ensure prefix starts with /
  if (prefix.length === 0 || prefix[0] !== "/") {
    prefix = "/" + prefix;
  }
  // ensure prefix *doesn't* end with / (unless it's exactly /)
  if (prefix.length > 1 && prefix[prefix.length - 1] === "/") {
    prefix = prefix.substr(0, prefix.length - 1);
  }
  return prefix;
}

export function URLTrie(prefix) {
  // create a new URLTrie with data
  this.prefix = trimPrefix(prefix || "/");
  this.branches = {};
  this.size = 0;
}

var _slashesRe = /^[/]+|[/]+$/g;

export function stringToPath(s) {
  // turn a /prefix/string/ into ['prefix', 'string']
  s = s.replace(_slashesRe, "");
  if (s.length === 0) {
    // special case because ''.split() gives [''], which is wrong.
    return [];
  } else {
    return s.split("/");
  }
}

URLTrie.prototype.add = function (path, data) {
  // add data to a node in the trie at path
  if (typeof path === "string") {
    path = stringToPath(path);
  }
  if (path.length === 0) {
    this.data = data;
    return;
  }
  var part = path.shift();
  if (!Object.prototype.hasOwnProperty.call(this.branches, part)) {
    // join with /, and handle the fact that only root ends with '/'
    var prefix = this.prefix.length === 1 ? this.prefix : this.prefix + "/";
    this.branches[part] = new URLTrie(prefix + part);
    this.size += 1;
  }
  this.branches[part].add(path, data);
};

URLTrie.prototype.remove = function (path) {
  // remove `path` from the trie
  if (typeof path === "string") {
    path = stringToPath(path);
  }
  if (path.length === 0) {
    // allow deleting root
    delete this.data;
    return;
  }
  var part = path.shift();
  var child = this.branches[part];
  if (child === undefined) {
    // Requested node doesn't exist,
    // consider it already removed.
    return;
  }
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

  // if I have data, return me, otherwise return undefined
  var me = this.data === undefined ? undefined : this;

  if (typeof path === "string") {
    path = stringToPath(path);
  }
  if (path.length === 0) {
    // exact match, it's definitely me!
    return me;
  }
  var part = path.shift();
  var child = this.branches[part];
  if (child === undefined) {
    // prefix matches, and I don't have any more specific children
    return me;
  } else {
    // I match and I have a more specific child that matches.
    // That *does not* mean that I have a more specific *leaf* that matches.
    var node = child.get(path);
    if (node) {
      // found a more specific leaf
      return node;
    } else {
      // I'm still the most specific match
      return me;
    }
  }
};
