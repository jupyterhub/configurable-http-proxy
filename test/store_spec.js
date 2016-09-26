// jshint jasmine: true

var store = require("../lib/store.js");

describe("MemoryStore", function () {
  beforeEach(function () {
    this.subject = store.MemoryStore();
  });

  describe("get", function () {
    it("returns the data for the specified path", function () {
      this.subject.add("/my_route", { "test": "value" });

      expect(this.subject.get("/my_route")).toEqual({ "test": "value" });
    });

    it("returns undefined when not found", function () {
      expect(this.subject.get("/wut")).toBe(undefined);
    });
  });

  describe("getAll", function () {
    it("returns all routes", function () {
      this.subject.add("/my_route", { "test": "value1" });
      this.subject.add("/my_other_route", { "test": "value2" });

      var routes = this.subject.getAll();
      expect(Object.keys(routes).length).toEqual(2);
      expect(routes["/my_route"]).toEqual({ "test": "value1" });
      expect(routes["/my_other_route"]).toEqual({ "test": "value2" });
    });

    it("returns a blank object when no routes defined", function () {
      expect(this.subject.getAll()).toEqual({});
    });
  });

  describe("add", function () {
    it("adds data to the store for the specified path", function () {
      this.subject.add("/my_route", { "test": "value" });

      expect(this.subject.get("/my_route")).toEqual({ "test": "value" });
    });

    it("overwrites any existing values", function () {
      this.subject.add("/my_route", { "test": "value" });
      this.subject.add("/my_route", { "test": "updatedValue" });

      expect(this.subject.get("/my_route")).toEqual({ "test": "updatedValue" });
    });
  });

  describe("update", function () {
    it("merges supplied data with existing data", function () {
      this.subject.add("/my_route", { "version": 1, "test": "value" });
      this.subject.update("/my_route", { "version": 2 });

      var route = this.subject.get("/my_route");
      expect(route["version"]).toEqual(2);
      expect(route["test"]).toEqual("value");
    });

    it("throws an error when the route doesn't exist", function () {
      var subject = this.subject;

      expect(function() { subject.update("/my_route", { "test": "value" }) }).toThrow();
    });
  });

  describe("remove", function () {
    it("removes a route from the table", function () {
      this.subject.add("/my_route", { "test": "value" });
      this.subject.remove("/my_route");

      expect(this.subject.get("/my_route")).toBe(undefined);
    });

    it("doesn't explode when route is not defined", function () {
      // would blow up if an error was thrown
      this.subject.remove("/my_route");
    });
  });

  describe("hasRoute", function () {
    it("returns false when the path is not found", function () {
      this.subject.add("/my_route", { "test": "value" });
      expect(this.subject.hasRoute("/my_route")).toBe(true)
    });

    it("returns false when the path is not found", function () {
      expect(this.subject.hasRoute("/wut")).toBe(false)
    });
  });
});
