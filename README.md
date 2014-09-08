# configurable-http-proxy

A simple wrapper around [node-http-proxy][] that adds a REST API for updating the routing table.

The proxy is developed as a part of the [Jupyter Hub][] multi-user server.

[node-http-proxy]: https://github.com/nodejitsu/node-http-proxy
[Jupyter Hub]: https://github.com/jupyter/jupyterhub


## dependencies
    
    # get the dependencies of the proxy (-g for global install)
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

## REST API

The REST API is authenticated via a token in the `Authorization` header.
The API is served under the `/api/routes` base URL.
For example:

    $> curl -H "Authorization: token $CONFIGPROXY_AUTH_TOKEN" http://localhost:8001/api/routes


### Getting the current routing table

    GET /api/routes

Returns a JSON dictionary of the current routing table. This *excludes* the default route.

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


