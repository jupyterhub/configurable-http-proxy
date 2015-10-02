# Changes in configurable-http-proxy

## 0.5 (dev)

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
