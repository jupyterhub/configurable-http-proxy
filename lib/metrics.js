"use strict";

var client = require("prom-client");
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

const apiRouteGetCount = new client.Counter({
  name: "api_route_get",
  help: "Count of API route get requests",
});

const apiRouteAddCount = new client.Counter({
  name: "api_route_add",
  help: "Count of API route add requests",
});

const apiRouteDeleteCount = new client.Counter({
  name: "api_route_delete",
  help: "Count of API route delete requests",
});

const findTargetForReqSummary = new client.Summary({
  name: "find_target_for_req",
  help: "Summary of find target requests",
});

const lastActivityUpdatingSummary = new client.Summary({
  name: "last_activity_updating",
  help: "Summary of last activity updating requests",
});

const requestsWsCount = new client.Counter({
  name: "requests_ws",
  help: "Count of websocket requests",
});

const requestsWebCount = new client.Counter({
  name: "requests_web",
  help: "Count of web requests",
});

const requestsApiCount = new client.Counter({
  name: "requests_api",
  help: "Count of API requests",
});

const requestsCount = new client.Counter({
  name: "requests",
  help: "Count of requests",
  labelNames: ["status"],
});

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

const mock = new Proxy(
  {},
  {
    get(target, name) {
      return mockCounter;
    },
  }
);

module.exports = {
  apiRouteGetCount,
  apiRouteAddCount,
  apiRouteDeleteCount,
  findTargetForReqSummary,
  lastActivityUpdatingSummary,
  requestsWsCount,
  requestsWebCount,
  requestsApiCount,
  requestsCount,
  render: function () {
    return client.register.metrics();
  },
  mock,
};
