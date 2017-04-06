**[Install](#install)** |
**[Usage](#usage)** |
**[Using the REST API](#using-the-rest-api)** |
**[Custom error pages](#custom-error-pages)** |
**[Host-based routing](#host-based-routing)** |
**[Troubleshooting](#troubleshooting)**

# configurable-http-proxy

[![Greenkeeper badge](https://badges.greenkeeper.io/jupyterhub/configurable-http-proxy.svg)](https://greenkeeper.io/)
[![Build Status](https://travis-ci.org/jupyterhub/configurable-http-proxy.svg?branch=master)](https://travis-ci.org/jupyterhub/configurable-http-proxy)
[![stable](https://img.shields.io/badge/stable-2.0.1-lightgrey.svg)](https://github.com/jupyterhub/configurable-http-proxy/releases/tag/2.0.1)

**configurable-http-proxy** (CHP) provides you with a way to update and manage
a proxy table using a command line interface or REST API.
It is a simple wrapper around [node-http-proxy][]. node-http-proxy is an HTTP
programmable proxying library that supports websockets and is suitable for
implementing components such as reverse proxies and load balancers. By
wrapping node-http-proxy, **configurable-http-proxy** extends this
functionality to [JupyterHub] deployments.

## Install

Prerequisite:

[Node.js](https://nodejs.org/en/download/) ≥ 4

Note: Ubuntu < 16.04 and Debian Jessie ship with too-old versions of Node
and must be upgraded.
We recommend using the latest stable or LTS version of Node.

To install the `configurable-http-proxy` package globally
using npm:

```
    npm install -g configurable-http-proxy
```

To install from the source code found in this GitHub repo:

```
    git clone https://github.com/jupyterhub/configurable-http-proxy
    cd configurable-http-proxy 
    npm install # Use 'npm install -g' for global install
```

## Usage

The configurable proxy runs two HTTP(S) servers:

1. The **public-facing interface to your application** (controlled by `--ip`,
   `--port`) listens on **all interfaces** by default.
2. The **inward-facing REST API** (`--api-ip`, `--api-port`) listens on
   localhost by default. The REST API uses token authorization, where the
   token is set by the `CONFIGPROXY_AUTH_TOKEN` environment variable.

![](./doc/_static/chp.png)

### Setting a default target

When you start the proxy from the command line, you can set a
**default target** (`--default-target` option) which will be used when no
matching route is found in the proxy table:

    configurable-http-proxy --default-target=http://localhost:8888

### Command-line options

```
  Usage: configurable-http-proxy [options]

  Options:

    -h, --help                       output usage information
    -V, --version                    output the version number
    --ip <ip-address>                Public-facing IP of the proxy
    --port <n> (defaults to 8000)    Public-facing port of the proxy

    --ssl-key <keyfile>              SSL key to use, if any
    --ssl-cert <certfile>            SSL certificate to use, if any
    --ssl-ca <ca-file>               SSL certificate authority, if any
    --ssl-request-cert               Request SSL certs to authenticate clients
    --ssl-reject-unauthorized        Reject unauthorized SSL connections (only meaningful if --ssl-request-cert is given)
    --ssl-protocol <ssl-protocol>    Set specific HTTPS protocol, e.g. TLSv1_2, TLSv1, etc.
    --ssl-ciphers <ciphers>          `:`-separated ssl cipher list. Default excludes RC4
    --ssl-allow-rc4                  Allow RC4 cipher for SSL (disabled by default)
    --ssl-dhparam <dhparam-file>     SSL Diffie-Helman Parameters pem file, if any

    --api-ip <ip>                    Inward-facing IP for API requests
    --api-port <n>                   Inward-facing port for API requests (defaults to --port=value+1)
    --api-ssl-key <keyfile>          SSL key to use, if any, for API requests
    --api-ssl-cert <certfile>        SSL certificate to use, if any, for API requests
    --api-ssl-ca <ca-file>           SSL certificate authority, if any, for API requests
    --api-ssl-request-cert           Request SSL certs to authenticate clients for API requests
    --api-ssl-reject-unauthorized    Reject unauthorized SSL connections (only meaningful if --api-ssl-request-cert is given)

    --default-target <host>          Default proxy target (proto://host[:port])
    --error-target <host>            Alternate server for handling proxy errors (proto://host[:port])
    --error-path <path>              Alternate server for handling proxy errors (proto://host[:port])
    --redirect-port <redirect-port>  Redirect HTTP requests on this port to the server on HTTPS
    --pid-file <pid-file>            Write our PID to a file
    --no-x-forward                   Don't add 'X-forward-' headers to proxied requests
    --no-prepend-path                Avoid prepending target paths to proxied requests
    --no-include-prefix              Don't include the routing prefix in proxied requests
    --insecure                       Disable SSL cert verification
    --host-routing                   Use host routing (host as first level of path)
    --statsd-host <host>             Host to send statsd statistics to
    --statsd-port <port>             Port to send statsd statistics to
    --statsd-prefix <prefix>         Prefix to use for statsd statistics
    --log-level <loglevel>           Log level (debug, info, warn, error)
    --proxy-timeout <n>              Timeout (in millis) when proxy receives no response from target
```


## Using the REST API

The configurable-http-proxy REST API is documented and available as:
- a nicely rendered, interactive version at the
[petstore swagger site][]
- a [swagger specification file][] in this repo

### Basics

**API Root**

| HTTP method | Endpoint | Function |
|-------------|----------|----------|
| GET         | /api/    | API Root |


**Routes**

| HTTP method | Endpoint                 | Function                            |
|-------------|--------------------------|-------------------------------------|
| GET         | /api/routes              | [Get all routes in routing table][] |
| POST        | /api/routes/{route_spec} | [Add a new route][]                 |
| DELETE      | /api/routes/{route_spec} | [Remove the given route][]          |

### Authenticating via passing a token

The REST API is authenticated via passing a token in the `Authorization`
header. The API is served under the `/api/routes` base URL.

For example, this `curl` command entered in the terminal
passes this header `"Authorization: token $CONFIGPROXY_AUTH_TOKEN"` for
authentication and this endpoint `http://localhost:8001/api/routes` to
retrieve the current routing table:

    curl -H "Authorization: token $CONFIGPROXY_AUTH_TOKEN" http://localhost:8001/api/routes

### Getting the routing table

**Request:**

```
    GET /api/routes[?inactive_since=ISO8601-timestamp]
```

**Parameters:**

`inactive_since`: If the `inactive_since` URL
parameter is given as an [ISO8601](http://en.wikipedia.org/wiki/ISO_8601)
timestamp, only routes whose `last_activity` is earlier than the timestamp
will be returned. The `last_activity` timestamp is updated whenever the proxy
passes data to or from the proxy target.

**Response:**

*Status code*

    status: 200 OK

*Response body*

A JSON dictionary of the current routing table. This JSON
dictionary *excludes* the default route.

**Behavior:**

The current routing table is returned to the user if the request is
successful.

### Adding new routes

POST requests create new routes. The body of the request should be a JSON
dictionary with at least one key: `target`, the target host to be proxied.

**Request:**

    POST /api/routes/[:path]

**Required input:**

`target`: The host URL

Example request body:
```json
{
  "/user/fred": {
    "target": "http://localhost:8002"
  },
  "/user/barbara": {
    "target": "http://localhost:8003"
  }
}
```

**Response:**

    status: 201 Created

**Behavior:**

After adding the new route, any request to `/path/prefix` on the proxy's
public interface will be proxied to `target`.

### Deleting routes

**Request:**

    DELETE /api/routes/[:path]

**Response:**

    status: 204 No Content

**Behavior:**

Removes a route from the proxy's routing table.


## Custom error pages

Beginning with version 0.5, custom error pages can be provided when the proxy
encounters an error and has no proxy target to handle a request. There are two
typical errors that CHP may hit, along with their status code:

- 404: a client has requested a URL for which there is no routing target.
  This **can be prevented** by setting a [`default target`][] before starting
  the configurable-http-proxy.

- 503: a route exists, but the upstream server isn't responding.
  This is more common, and can be due to any number of reasons,
  including the target service having died or not finished starting.

### Setting the path for custom error pages

Specify an error path `--error-path /usr/share/chp-errors` when
starting the CHP:

    configurable-http-proxy --error-path /usr/share/chp-errors

When a proxy error occurs, CHP will look in the following location for a
custom html error page to serve:

    /usr/share/chp-errors/{CODE}.html

where `{CODE}` is a status code number for an html page to serve. If there is
a 503 error, CHP will look for a custom error page in this location
`/usr/share/chp-errors/503.html`.

If no custom error html file exists for the error code, CHP will use the
`error.html`. If you specify an error path, **make sure** you also create
an `error.html` file.

### Setting a target for custom error handling

You can specify a target to use when errors occur by using `--error-target {URL}`
when starting the CHP.
If, for example, CHP starts with `--error-target http://localhost:1234`,
then when the proxy encounters an error, it will make a GET request to
the `error-target` server, with URL `http://localhost:1234` and status code
`/{CODE}`, and failing request's URL escaped in a URL parameter, e.g.:

    GET /404?url=%2Fescaped%2Fpath


## Host-based routing

If the CHP is started with the `--host-routing` option, the proxy will
use the hostname of the incoming request to select a target.

When using host-based routes, the API uses the target in the same way as if
the hostname were the first part of the URL path, e.g.:

```python
{
  "/example.com": "https://localhost:1234",
  "/otherdomain.biz": "http://10.0.1.4:5555",
}
```

## Troubleshooting

Q: My proxy is not starting. What could be happening?

- If this occurs on Ubuntu/Debian, check that the you are using a recent
  version of node. Some versions of Ubuntu/Debian come with a version of node
  that is very old, and it is necessary to update node.


[**Return to top**][]



[node-http-proxy]: https://github.com/nodejitsu/node-http-proxy
[JupyterHub]: https://github.com/jupyterhub/jupyterhub
[petstore swagger site]: http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyterhub/configurable-http-proxy/master/doc/rest-api.yml#/default
[swagger specification file]: https://github.com/jupyterhub/configurable-http-proxy/blob/master/doc/rest-api.yml
[Get all routes in routing table]: #getting-the-routing-table
[Add a new route]: #adding-new-routes
[Remove the given route]: #deleting-routes
[`default target`]: #setting-a-default-target
[**Return to top**]: #configurable-http-proxy
