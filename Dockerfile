FROM node:12.13-alpine

LABEL maintainer="Jupyter Project <jupyter@googlegroups.com>"

# Useful tools for debugging
RUN apk add --no-cache jq curl

RUN mkdir -p /srv/configurable-http-proxy
COPY . /srv/configurable-http-proxy
WORKDIR /srv/configurable-http-proxy
RUN npm install -g

USER 65534

ENTRYPOINT ["/srv/configurable-http-proxy/chp-docker-entrypoint"]
