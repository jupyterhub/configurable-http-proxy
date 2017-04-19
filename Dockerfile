FROM node:6-alpine

EXPOSE 8000

ADD . /srv/configurable-http-proxy
WORKDIR /srv/configurable-http-proxy
RUN npm install -g

USER nobody

ENTRYPOINT ["configurable-http-proxy"]
