**[Install](#install)** |
**[Using configurable-http-proxy](#using-configurable-http-proxy)** |
**[Using the REST API](#using-the-rest-api)** |
**[Custom error pages](#custom-error-pages)** |
**[Host-based routing](#host-based-routing)**

# configurable-http-proxy

[![Build Status](https://travis-ci.org/jupyterhub/configurable-http-proxy.svg?branch=master)](https://travis-ci.org/jupyterhub/configurable-http-proxy)


**configurable-http-proxy**, a simple wrapper around [node-http-proxy][], adds
a REST API for updating the routing table.

The proxy is developed as a part of the [JupyterHub][] multi-user server.

Note: [node-http-proxy][] is an HTTP programmable proxying library
that supports websockets. It is suitable for implementing components such
as reverse proxies and load balancers. configurable-http-proxy wraps
node-http-proxy to provide this functionality to JupyterHub.

[node-http-proxy]: https://github.com/nodejitsu/node-http-proxy
[JupyterHub]: https://github.com/jupyterhub/jupyterhub


## Install

Prerequisite: [Node.js](https://nodejs.org/en/download/)

To install globally from the `configurable-http-proxy` package release
using the npm package manager:

    npm install -g configurable-http-proxy

To install from the source code found in this GitHub repo:
    
    git clone https://github.com/jupyterhub/configurable-http-proxy.git
    cd configurable-http-proxy
    # Use -g for global install
    npm install [-g]


## Using configurable-http-proxy

The configurable proxy runs two HTTP(S) servers:

1. The **public-facing interface to your application** (controlled by `--ip`,
   `--port`, etc.). This listens on **all interfaces** by default.
2. The **inward-facing REST API** (`--api-ip`, `--api-port`). This listens on
   localhost by default. The REST API uses token authorization, set by the
   `CONFIGPROXY_AUTH_TOKEN` environment variable.

![](./doc/_static/chp.png)

### Setting a default target

When you start the proxy from the command line, you can set a 
default target (`--default-target` option) to be used when no
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

The configurable-http-proxy API is documented and available at the 
interactive swagger site, [petstore](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyterhub/configurable-http-proxy/master/doc/rest-api.yml#/default)
or as a [swagger specification file in this repo](https://github.com/jupyterhub/configurable-http-proxy/blob/master/doc/rest-api.yml).

### Authenticating via passing a token

The REST API is authenticated via passing a token in the `Authorization` header.
The API is served under the `/api/routes` base URL. For example, execute
this `curl` command in the terminal to authenticate and retrieve the
current routing table:

    curl -H "Authorization: token $CONFIGPROXY_AUTH_TOKEN" http://localhost:8001/api/routes

### Getting the current routing table

**Request**

    GET /api/routes[?inactive_since=ISO8601-timestamp]

The GET request returns a JSON dictionary of the current routing table.

This JSON dictionary *excludes* the default route. If the `inactive_since` URL
parameter is given as an [ISO8601](http://en.wikipedia.org/wiki/ISO_8601)
timestamp, only routes whose `last_activity` is earlier than the timestamp
will be returned.

**Response**

Status code:

    status: 200 OK

Returned JSON dictionary of current routing table:

```json
{
  "/user/foo": {
    "target": "http://localhost:8002",
    "last_activity": "2014-09-08T19:43:08.321Z"
  },
  "/user/bar": {
    "target": "http://localhost:8003",
    "last_activity": "2014-09-08T19:40:17.819Z"
  }
}
```

The `last_activity` timestamp is updated whenever the proxy passes data to
or from the proxy target.

### Adding new routes

POST requests create new routes. The body of the request should be a JSON
dictionary with at least one key: `target`, the target host to be proxied.

**Request**

    POST /api/routes/[:path]

*Input - request body*

`target`: The host URL

**Response**

    status: 201 Created

After adding the new route, any request to `/path/prefix` on the proxy's
public interface will be proxied to `target`.

### Deleting routes

**Request**

    DELETE /api/routes/[:path]

**Response**

    status: 204 No Content

Removes a route from the proxy's routing table.


## Custom error pages

With version 0.5, configurable-host-proxy (CHP) adds two ways to provide
custom error pages when the proxy encounters an error, and has no proxy target
to handle a request. There are two typical errors that CHP can hit, along
with their status code:

- 404: a client has requested a URL for which there is no routing target.
  This can be prevented if a `default target` is specified when starting
  the configurable-http-proxy.
  
- 503: a route exists, but the upstream server isn't responding.
  This is more common, and can be due to any number of reasons,
  including the target service having died or not finished starting.

### error-path

If you specify an error path `--error-path /usr/share/chp-errors` when
starting the CHP:
 
    configurable-http-proxy --error-path /usr/share/chp-errors
 
then when a proxy error occurs, CHP will look in 
`/usr/share/chp-errors/<CODE>.html` (where CODE is the status code number)
for an html page to serve, e.g. `404.html` or `503.html`.

If no file exists for the error code, `error.html` file will be used.
If you specify an error path, make sure you also create `error.html`.

### error-target

When starting the CHP, you can pass a command line option for `--error-target`.
If you specify `--error-target http://localhost:1234`,
then when the proxy encounters an error, it will make a GET request to 
this server, with URL `/CODE`, and the URL of the failing request
escaped in a URL parameter, e.g.:

    GET /404?url=%2Fescaped%2Fpath


## Host-based routing

If the CHP is started with the `--host-routing` option, the proxy will
pick a target based on the host of the incoming request, instead of the
URL prefix.

The API when using host-based routes is the same as if the hostname were the
first part of the URL path, e.g.:

```python
{
  "/example.com": "https://localhost:1234",
  "/otherdomain.biz": "http://10.0.1.4:5555",
}
```
