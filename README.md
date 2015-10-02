# configurable-http-proxy

A simple wrapper around [node-http-proxy][] that adds a REST API for updating the routing table.

The proxy is developed as a part of the [Jupyter Hub][] multi-user server.

[node-http-proxy]: https://github.com/nodejitsu/node-http-proxy
[Jupyter Hub]: https://github.com/jupyter/jupyterhub


## Install

To install `configurable-http-proxy`:

    npm install -g jupyter/configurable-http-proxy

To install from the repo:
    
    git clone https://github.com/jupyter/configurable-http-proxy.git
    cd configurable-http-proxy
    # Use -g for global install
    npm install [-g]

## Using configurable-http-proxy


the configurable proxy runs two HTTP(S) servers:

1. The public-facing interface to your application (controlled by `--ip`, `--port`, etc.).
   This listens on **all interfaces** by default.
2. The inward-facing REST API (`--api-ip`, `--api-port`). This listens on localhost by default.
   The REST API uses token authorization, set by the `CONFIGPROXY_AUTH_TOKEN` environment variable.

When you start the proxy, you can set a default target to be used when no match is found
in the proxy table:

    $ configurable-http-proxy --default-target=http://localhost:8888

### Options

```
  Usage: configurable-http-proxy [options]

  Options:

    -h, --help                       output usage information
    -V, --version                    output the version number
    --ip <n>                         Public-facing IP of the proxy
    --port <n>                       Public-facing port of the proxy
    --ssl-key <keyfile>              SSL key to use, if any
    --ssl-cert <certfile>            SSL certificate to use, if any
    --api-ip <ip>                    Inward-facing IP for API requests
    --api-port <n>                   Inward-facing port for API requests
    --api-ssl-key <keyfile>          SSL key to use, if any, for API requests
    --api-ssl-cert <certfile>        SSL certificate to use, if any, for API requests
    --default-target <host>          Default proxy target (proto://host[:port]
    --error-target <host>            Alternate server for handling proxy errors (proto://host[:port]
    --error-path <path>              Alternate server for handling proxy errors (proto://host[:port]
    --redirect-port <redirect-port>  Redirect HTTP requests on this port to the server on HTTPS
    --no-x-forward                   Don't add 'X-forward-' headers to proxied requests
    --no-prepend-path                Avoid prepending target paths to proxied requests
    --no-include-prefix              Don't include the routing prefix in proxied requests
    --insecure                       Disable SSL cert verification
    --host-routing                   Use host routing (host as first level of path)
    --log-level <loglevel>           Log level (debug, info, warn, error)
```

## REST API

The REST API is authenticated via a token in the `Authorization` header.
The API is served under the `/api/routes` base URL.
For example:

    $> curl -H "Authorization: token $CONFIGPROXY_AUTH_TOKEN" http://localhost:8001/api/routes


### Getting the current routing table

    GET /api/routes[?inactive_since=ISO8601-timestamp]

Returns a JSON dictionary of the current routing table. This *excludes* the default route.
If the `inactive_since` URL parameter is given as an [ISO8601](http://en.wikipedia.org/wiki/ISO_8601) timestamp,
only routes whose `last_activity` is earlier than the timestamp will be returned.

#### Response

    status: 200 OK

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

The `last_activity` timestamp is updated whenever the proxy passes any data to or from
the proxy target.


### Adding new routes

POST requests create new routes. The body of the request should be a JSON dictionary
with at least one key: `target`, the host to be proxied.

    POST /api/routes/[:path]

#### Input

<dl>
    <dt>target</dt>
    <dd>The host URL</dd>
</dl>

#### Response

    status: 201 Created

Any request to `/path/prefix` on the proxy's public interface will be proxied to `target`.

### Deleting routes

    DELETE /api/routes/[:path]

#### Response

    status: 204 No Content

## Custom error pages

CHP 0.5 adds two ways to provide custom error pages when the proxy encounters an error,
and has no proxy target to handle a request. There are two typical errors that CHP can hit:

- 404: a client has requested a URL for which there is no routing target.
  This is impossible if a default target has been specified.
- 503: a route exists, but the upstream server isn't responding.
  This is more common, and can be due to any number of reasons,
  including the target service having died or not finished starting.

### error-path

If you specify `--error-path /usr/share/chp-errors`,
then when a proxy error occurs, CHP will look in `/usr/share/chp-errors/CODE.html` for an html page to serve,
e.g. `404.html` or `503.html`.
If no file exists for the error code,  `error.html` file will be used.
If you use this scheme, make sure you have at least `error.html`.

### error-target

If you specify `--error-target http://localhost:1234`,
then when the proxy encounters an error, it will make a GET request to this server, with URL `/CODE`,
and the URL of the failing request escaped in a URL parameter, e.g.:

    GET /404?url=%2Fescaped%2Fpath


## Host-based routing

If `--host-routing` is given, the proxy will pick a target based on the host of the incoming request,
instead of the URL prefix.
The API when using host-based routes is the same as if the hostname were the first part of the URL path, e.g.

```python
{
  "/example.com": "https://localhost:1234",
  "/otherdomain.biz": "http://10.0.1.4:5555",
}
```

etc.
