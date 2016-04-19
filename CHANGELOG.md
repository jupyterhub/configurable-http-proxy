# Changes in configurable-http-proxy

## 1.2

- add statsd support

## 1.1

- add `--ssl-request-cert` args for certificate-based client authentication
- fix some SSL parameters that were ignored for API requests

## 1.0

- add `ConfigProxy.proxy_request` event, for customizing requests as the pass through the proxy.
- add more ssl-related options for specifying options on the CLI.
- fix regression in 0.5 where deleting a top-level route would also delete the default route.

## 0.5

- add `--error-target` for letting another http server render error pages.
  Server must handle `/404` and `/503` URLs.
- add `--error-path` for custom static HTML error pages.
  `[CODE].html` will be used if it exists, otherwise `error.html`.
- fix bug preventing root route from being deleted

## 0.4

- add `--redirect-port` for automatically redirecting a common port to the correct one (e.g. redirecting http to https)

## 0.3

- fixes for URL escaping
- add host-based routing
