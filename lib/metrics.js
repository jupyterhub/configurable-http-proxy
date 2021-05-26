"use strict";

var client = require("prom-client");

class Metrics {
  constructor() {
    this.register = new client.Registry();
    client.collectDefaultMetrics({ register: this.register });

    this.apiRouteGetCount = new client.Counter({
      name: "api_route_get",
      help: "Count of API route get requests",
      registers: [this.register],
    });

    this.apiRouteAddCount = new client.Counter({
      name: "api_route_add",
      help: "Count of API route add requests",
      registers: [this.register],
    });

    this.apiRouteDeleteCount = new client.Counter({
      name: "api_route_delete",
      help: "Count of API route delete requests",
      registers: [this.register],
    });

    this.findTargetForReqSummary = new client.Summary({
      name: "find_target_for_req",
      help: "Summary of find target requests",
      registers: [this.register],
    });

    this.lastActivityUpdatingSummary = new client.Summary({
      name: "last_activity_updating",
      help: "Summary of last activity updating requests",
      registers: [this.register],
    });

    this.requestsWsCount = new client.Counter({
      name: "requests_ws",
      help: "Count of websocket requests",
      registers: [this.register],
    });

    this.requestsWebCount = new client.Counter({
      name: "requests_web",
      help: "Count of web requests",
      registers: [this.register],
    });

    this.requestsProxyCount = new client.Counter({
      name: "requests_proxy",
      help: "Count of proxy requests",
      labelNames: ["status"],
      registers: [this.register],
    });

    this.requestsApiCount = new client.Counter({
      name: "requests_api",
      help: "Count of API requests",
      labelNames: ["status"],
      registers: [this.register],
    });
  }

  render(res) {
    return this.register.metrics().then((s) => {
      res.writeHead(200, { "Content-Type": this.register.contentType });
      res.write(s);
      res.end();
    });
  }
}

class MockMetrics {
  constructor() {
    return new Proxy(this, {
      get(target, name) {
        const mockCounter = new Proxy(
          {},
          {
            get(target, name) {
              if (name == "inc") {
                return () => {};
              }
              if (name == "startTimer") {
                return () => {
                  return () => {};
                };
              }
              if (name == "labels") {
                return () => {
                  return mockCounter;
                };
              }
            },
          }
        );
        return mockCounter;
      },
    });
  }

  render(res) {
    return Promise.resolve();
  }
}

module.exports = {
  Metrics,
  MockMetrics,
};
