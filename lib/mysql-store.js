"use strict";

var SqlString = require("sqlstring");
const mysql = require("mysql");

class MySQLStore {
  constructor() {
    this.connection = mysql.createConnection({
      host: process.env.MYSQL_HOST || "localhost",
      database: process.env.MYSQL_DATABASE || "chp",
      user: process.env.MYSQL_USER || "chp",
      password: process.env.MYSQL_PASSWORD || "chp",
    });
  }

  cleanPath(prefix) {
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

  get(path) {
    const route = this.cleanPath(path);
    const sql = `SELECT * FROM routes WHERE route = "${route}"`;
    return new Promise((resolve, reject) => {
      this.connection.query(sql, function (err, result) {
        if (err) reject(err);
        if (result[0]) {
          const value = JSON.parse(result[0].target);
          return resolve(value);
        }
        return resolve(undefined);
      });
    });
  }

  getTarget(path) {
    let i = [];
    let pathPrefixes = ["/"];
    path.split("/").forEach((part) => {
      i.push(part);
      const prefix = i.join("/");
      if (prefix.length) pathPrefixes.push(prefix);
    });
    const questions = pathPrefixes.map((i) => "?").join(",");
    const sql = SqlString.format(
      `SELECT * FROM routes WHERE route IN (${questions}) ORDER BY route DESC LIMIT 1`,
      pathPrefixes
    );
    return new Promise((resolve, reject) => {
      this.connection.query(sql, function (err, result) {
        if (err) reject(err);
        if (result[0]) {
          const data = {
            prefix: path,
            data: JSON.parse(result[0].target),
          };
          console.log("getTarget", path, "data", data);
          return resolve(data);
        }
        return resolve(undefined);
      });
    });
  }

  getAll() {
    const sql = `SELECT * FROM routes`;
    return new Promise((resolve, reject) => {
      this.connection.query(sql, function (err, result) {
        if (err) reject(err);
        const routes = {};
        result.forEach((row) => {
          routes[row.route] = JSON.parse(row.target);
        });
        return resolve(routes);
      });
    });
  }

  add(path, data) {
    path = this.cleanPath(path);
    const sql = SqlString.format("REPLACE INTO routes VALUES (?, ?)", [path, JSON.stringify(data)]);
    return new Promise((resolve, reject) => {
      this.connection.query(sql, function (err, result) {
        return resolve(null);
      });
    });
  }

  update(path, data) {
    return new Promise((resolve, reject) => {
      this.get(path).then((existingData) => {
        const mergedData = { ...existingData, ...data };
        const sql = SqlString.format("UPDATE routes SET target=? WHERE route=?", [
          JSON.stringify(mergedData),
          this.cleanPath(path),
        ]);
        this.connection.query(sql, function (err, result) {
          if (err) reject(err);
          resolve("mergedData");
        });
      });
    });
  }

  remove(path) {
    path = this.cleanPath(path);
    var route = this.routes[path];
    const sql = SqlString.format("DELETE FROM routes WHERE route = ?", [path]);
    return new Promise((resolve, reject) => {
      this.connection.query(sql, function (err, result) {
        resolve(null);
      });
    });
  }
}

module.exports = MySQLStore;
