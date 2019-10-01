FROM node:10-alpine

EXPOSE 8000

# Useful tools for debugging
RUN apk add --no-cache jq curl

ADD . /srv/configurable-http-proxy
WORKDIR /srv/configurable-http-proxy
RUN npm install -g

USER 65534

ENTRYPOINT ["/srv/configurable-http-proxy/chp-docker-entrypoint"]
