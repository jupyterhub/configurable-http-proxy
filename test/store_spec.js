import { MemoryStore } from "../lib/store.js";

describe("MemoryStore", function () {
  beforeEach(function () {
    this.subject = new MemoryStore();
  });

  describe("get", function () {
    it("returns the data for the specified path", function (done) {
      this.subject.add("/myRoute", { test: "value" });

      this.subject.get("/myRoute").then(function (data) {
        expect(data).toEqual({ test: "value" });
        done();
      });
    });

    it("returns undefined when not found", function (done) {
      this.subject.get("/wut").then((result) => {
        expect(result).toBe(undefined);
        done();
      });
    });
  });

  describe("getTarget", function () {
    it("returns the target object for the path", function (done) {
      this.subject.add("/myRoute", { target: "http://localhost:8213" });

      this.subject.getTarget("/myRoute").then(function (target) {
        expect(target.prefix).toEqual("/myRoute");
        expect(target.data.target).toEqual("http://localhost:8213");
        done();
      });
    });
  });

  describe("getAll", function () {
    it("returns all routes", function (done) {
      this.subject.add("/myRoute", { test: "value1" });
      this.subject.add("/myOtherRoute", { test: "value2" });

      this.subject.getAll().then(function (routes) {
        expect(Object.keys(routes).length).toEqual(2);
        expect(routes["/myRoute"]).toEqual({ test: "value1" });
        expect(routes["/myOtherRoute"]).toEqual({ test: "value2" });
        done();
      });
    });

    it("returns a blank object when no routes defined", function (done) {
      this.subject.getAll().then(function (routes) {
        expect(routes).toEqual({});
        done();
      });
    });
  });

  describe("add", function () {
    it("adds data to the store for the specified path", function (done) {
      this.subject.add("/myRoute", { test: "value" });

      this.subject.get("/myRoute").then(function (route) {
        expect(route).toEqual({ test: "value" });
        done();
      });
    });

    it("overwrites any existing values", function (done) {
      this.subject.add("/myRoute", { test: "value" });
      this.subject.add("/myRoute", { test: "updatedValue" });

      this.subject.get("/myRoute").then(function (route) {
        expect(route).toEqual({ test: "updatedValue" });
        done();
      });
    });
  });

  describe("update", function () {
    it("merges supplied data with existing data", function (done) {
      this.subject.add("/myRoute", { version: 1, test: "value" });
      this.subject.update("/myRoute", { version: 2 });

      this.subject.get("/myRoute").then(function (route) {
        expect(route.version).toEqual(2);
        expect(route.test).toEqual("value");
        done();
      });
    });
  });

  describe("remove", function () {
    it("removes a route from the table", function (done) {
      this.subject.add("/myRoute", { test: "value" });
      this.subject.remove("/myRoute");

      this.subject.get("/myRoute").then(function (route) {
        expect(route).toBe(undefined);
        done();
      });
    });

    it("doesn't explode when route is not defined", function (done) {
      // would blow up if an error was thrown
      this.subject.remove("/myRoute/foo/bar").then(done);
    });
  });

  describe("hasRoute", function () {
    it("returns false when the path is not found", function (done) {
      this.subject
        .add("/myRoute", { test: "value" })
        .then(() => this.subject.get("/myRoute"))
        .then((result) => {
          expect(result).toEqual({ test: "value" });
        })
        .then(done);
    });

    it("returns false when the path is not found", function (done) {
      this.subject
        .get("/wut")
        .then(function (result) {
          expect(result).toBe(undefined);
        })
        .then(done);
    });
  });
});
