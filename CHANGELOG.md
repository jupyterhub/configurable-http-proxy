# Changes in configurable-http-proxy

For detailed changes from the prior release, click on the version number, and
its link will bring up a GitHub listing of changes. Use `git log` on the
command line for details.

## [Unreleased]

## [2.0] - 2017-04-05

### 2.0.3 - 2017-06-12

- Fix docker image entrypoint, broken in 2.0.2

### 2.0.2 - 2017-06-07

- Fix error raised trying to `setHeader` on an undefined response (e.g. when encountering socket-level error)

### 2.0.1

**Important** CHP 2.0.0 drops support for node.js ≤ 4.0.

**Added:**

- Add configuration option for proxy timeout `--proxy-timeout <n>, Timeout
  (in millis) when proxy receives no response from target.`
  [\#86](https://github.com/jupyterhub/configurable-http-proxy/pull/86)
- Add configuration options for auto rewrite and protocol rewrite
  [\#73](https://github.com/jupyterhub/configurable-http-proxy/pull/73):
    - `--auto-rewrite, Rewrite the Location header host/port in redirect responses`
    - `--protocol-rewrite <proto>', Rewrite the Location header protocol in redirect responses to the specified protocol`
- Add low-level code for separate stores of routes to enable future support of other data stores such as Redis [\#81](https://github.com/jupyterhub/configurable-http-proxy/pull/81)

**Changed:**

- Support only LTS releases and above for NodeJS [\#82](https://github.com/jupyterhub/configurable-http-proxy/pull/82).
  This means only ≥ 4.0 are supported.

**Fixed:**

- Fix behavior to correctly handle children when a parent node is deleted [\#93](https://github.com/jupyterhub/configurable-http-proxy/pull/93)
- Fix closure reference when serving custom error pages [\#91](https://github.com/jupyterhub/configurable-http-proxy/pull/91)
- Improved all-interfaces warning message when `ip='*'`  [\#94](https://github.com/jupyterhub/configurable-http-proxy/pull/94)

## [1.3] - 2016-08-01

### 1.3.1

- small fixes for node 6 support
- fix `--no-x-forward` again (for real, this time)

### 1.3.0

- add `--ssl-protocol`, so that one can restrict to TLS, e.g. `--ssl-protocol=TLSv1`
- fix handling of ``--no-x-forward`

## [1.2] - 2016-04-19

- add statsd support

## [1.1] - 2016-01-04

- add `--ssl-request-cert` args for certificate-based client authentication
- fix some SSL parameters that were ignored for API requests

## [1.0] - 2016-01-04

- add `ConfigProxy.proxy_request` event, for customizing requests as the pass through the proxy.
- add more ssl-related options for specifying options on the CLI.
- fix regression in 0.5 where deleting a top-level route would also delete the default route.

## [0.5] - 2015-10-05

- add `--error-target` for letting another http server render error pages.
  Server must handle `/404` and `/503` URLs.
- add `--error-path` for custom static HTML error pages.
  `[CODE].html` will be used if it exists, otherwise `error.html`.
- fix bug preventing root route from being deleted

## [0.4] - 2015-10-02

- add `--redirect-port` for automatically redirecting a common port to the correct one (e.g. redirecting http to https)

## [0.3] - 2015-04-29

- fixes for URL escaping
- add host-based routing

## [0.2.1] - 2014-11-21

## [0.2.0] - 2014-11-14

## 0.1.1 - 2014-10-01

[Unreleased]: https://github.com/jupyterhub/configurable-http-proxy/compare/2.0.2...HEAD
[2.0]: https://github.com/jupyterhub/configurable-http-proxy/compare/1.3.1...2.0.1
[1.3]: https://github.com/jupyterhub/configurable-http-proxy/compare/1.2.0...1.3.0
[1.2]: https://github.com/jupyterhub/configurable-http-proxy/compare/1.1.0...1.2.0
[1.1]: https://github.com/jupyterhub/configurable-http-proxy/compare/1.0.0...1.1.0
[1.0]: https://github.com/jupyterhub/configurable-http-proxy/compare/0.5.0...1.0.0
[0.5]: https://github.com/jupyterhub/configurable-http-proxy/compare/0.4.0...0.5.0
[0.4]: https://github.com/jupyterhub/configurable-http-proxy/compare/0.3.0...0.4.0
[0.3]: https://github.com/jupyterhub/configurable-http-proxy/compare/0.2.1...0.3.0
[0.2.1]: https://github.com/jupyterhub/configurable-http-proxy/compare/0.2.0...0.2.1
[0.2.0]: https://github.com/jupyterhub/configurable-http-proxy/compare/0.1.1...0.2.0
