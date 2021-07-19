# Changes in configurable-http-proxy

For detailed changes from the prior release, click on the version number, and
its link will bring up a GitHub listing of changes. Use `git log` on the
command line for details.

## [Unreleased]

## 4.5

### [4.5.0] - 2021-07-19

This minor release will only be available for you if you have node version 12
and higher as we have explicitly dropped support for lower versions.

#### Bugs fixed

- Fix to flags configuring ip addresses for ipv4+ipv6 compatebility [#333](https://github.com/jupyterhub/configurable-http-proxy/pull/333) ([@consideRatio](https://github.com/consideRatio))
- Handle store backend errors [#325](https://github.com/jupyterhub/configurable-http-proxy/pull/325) ([@dtaniwaki](https://github.com/dtaniwaki))
- Require node 12+ explicitly [#323](https://github.com/jupyterhub/configurable-http-proxy/pull/323) ([@consideRatio](https://github.com/consideRatio))
- Set client SSL on only CA case [#319](https://github.com/jupyterhub/configurable-http-proxy/pull/319) ([@dtaniwaki](https://github.com/dtaniwaki))

#### Documentation improvements

- docs: update outdated requirement of node [#335](https://github.com/jupyterhub/configurable-http-proxy/pull/335) ([@consideRatio](https://github.com/consideRatio))
- Amend changelog about dropping statsd [#317](https://github.com/jupyterhub/configurable-http-proxy/pull/317) ([@consideRatio](https://github.com/consideRatio))

#### Continuous integration improvements

- ci: add tests of node 16 [#334](https://github.com/jupyterhub/configurable-http-proxy/pull/334) ([@consideRatio](https://github.com/consideRatio))
- ci: fix details in workflows causing duplicated builds and a failure [#326](https://github.com/jupyterhub/configurable-http-proxy/pull/326) ([@consideRatio](https://github.com/consideRatio))

#### Dependency updates

- Bump ws from 7.4.5 to 7.5.3 [#324](https://github.com/jupyterhub/configurable-http-proxy/pull/324) [#328](https://github.com/jupyterhub/configurable-http-proxy/pull/328) [#332](https://github.com/jupyterhub/configurable-http-proxy/pull/332), [#331](https://github.com/jupyterhub/configurable-http-proxy/pull/331) ([@dependabot](https://github.com/dependabot))
- Bump commander from 7.2.0 to 8.0.0 [#329](https://github.com/jupyterhub/configurable-http-proxy/pull/329) ([@dependabot](https://github.com/dependabot))

#### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterhub/configurable-http-proxy/graphs/contributors?from=2021-05-26&to=2021-07-19&type=c))

[@consideRatio](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3AconsideRatio+updated%3A2021-05-26..2021-07-19&type=Issues) | [@dtaniwaki](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3Adtaniwaki+updated%3A2021-05-26..2021-07-19&type=Issues) | [@Icare2000](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3AIcare2000+updated%3A2021-05-26..2021-07-19&type=Issues) | [@manics](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3Amanics+updated%3A2021-05-26..2021-07-19&type=Issues) | [@minrk](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3Aminrk+updated%3A2021-05-26..2021-07-19&type=Issues)

## 4.4

### [4.4.0] - 2021-05-26

#### Breaking change

- By mistake we released this as version 4.4.0 instead of 5.0.0 even though we introduced
  a breaking change in [#314](https://github.com/jupyterhub/configurable-http-proxy/pull/314) by
  dropping support for using [statsd](https://github.com/statsd/statsd#readme) metrics.

#### New features added

- Support prometheus metrics [#314](https://github.com/jupyterhub/configurable-http-proxy/pull/314) ([@dtaniwaki](https://github.com/dtaniwaki))

#### Documentation improvements

- readme: update --help output [#315](https://github.com/jupyterhub/configurable-http-proxy/pull/315) ([@consideRatio](https://github.com/consideRatio))

#### Dependency bumps

- Bump lodash from 4.17.20 to 4.17.21 [#312](https://github.com/jupyterhub/configurable-http-proxy/pull/312) ([@dependabot](https://github.com/dependabot))
- Bump ws from 7.4.4 to 7.4.5 [#306](https://github.com/jupyterhub/configurable-http-proxy/pull/306) ([@dependabot](https://github.com/dependabot))

#### Continuous integration

- ci: github actions security [#307](https://github.com/jupyterhub/configurable-http-proxy/pull/307) ([@consideRatio](https://github.com/consideRatio))

#### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterhub/configurable-http-proxy/graphs/contributors?from=2021-04-12&to=2021-05-26&type=c))

[@consideRatio](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3AconsideRatio+updated%3A2021-04-12..2021-05-26&type=Issues) | [@dependabot](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3Adependabot+updated%3A2021-04-12..2021-05-26&type=Issues) | [@dtaniwaki](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3Adtaniwaki+updated%3A2021-04-12..2021-05-26&type=Issues) | [@minrk](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3Aminrk+updated%3A2021-04-12..2021-05-26&type=Issues)

## 4.3

### [4.3.2] - 2021-04-12

#### Enhancements made

- Build and publish Docker Hub image for amd64 and arm64 [#304](https://github.com/jupyterhub/configurable-http-proxy/pull/304) ([@manics](https://github.com/manics))

#### Maintenance and upkeep improvements

- Bump jasmine from 3.6.4 to 3.7.0 [#302](https://github.com/jupyterhub/configurable-http-proxy/pull/302) ([@dependabot](https://github.com/dependabot))
- Bump commander from 7.1.0 to 7.2.0 [#301](https://github.com/jupyterhub/configurable-http-proxy/pull/301) ([@dependabot](https://github.com/dependabot))
- Bump ws from 7.4.3 to 7.4.4 [#299](https://github.com/jupyterhub/configurable-http-proxy/pull/299) ([@dependabot](https://github.com/dependabot))

#### Documentation improvements

- Simplify RELEASE.md with npm version [#298](https://github.com/jupyterhub/configurable-http-proxy/pull/298) ([@minrk](https://github.com/minrk))

#### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterhub/configurable-http-proxy/graphs/contributors?from=2021-03-05&to=2021-04-12&type=c))

[@consideRatio](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3AconsideRatio+updated%3A2021-03-05..2021-04-12&type=Issues) | [@dependabot](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3Adependabot+updated%3A2021-03-05..2021-04-12&type=Issues) | [@manics](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3Amanics+updated%3A2021-03-05..2021-04-12&type=Issues) | [@minrk](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3Aminrk+updated%3A2021-03-05..2021-04-12&type=Issues)

### [4.3.1] - 2021-03-05

#### Bugs fixed

- informative error when host cannot be determined for http->https redirect [#295](https://github.com/jupyterhub/configurable-http-proxy/pull/295) ([@minrk](https://github.com/minrk))

#### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterhub/configurable-http-proxy/graphs/contributors?from=2021-03-05&to=2021-03-05&type=c))

[@consideRatio](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3AconsideRatio+updated%3A2021-03-05..2021-03-05&type=Issues) | [@manics](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3Amanics+updated%3A2021-03-05..2021-03-05&type=Issues) | [@minrk](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3Aminrk+updated%3A2021-03-05..2021-03-05&type=Issues)

### [4.3.0] - 2021-03-05

4.3 is a small release that should mostly improve behavior
when things are going wrong,
especially when endpoints are unavailable and clients are still trying to talk to them.

In particular:

- requests to unavailable endpoints no longer register as activity
- improved error handling and quieter logging in these cases,
  especially when running on node >= 12.9.

#### Enhancements made

- Do not update activity on failed requests [#292](https://github.com/jupyterhub/configurable-http-proxy/pull/292) ([@minrk](https://github.com/minrk))

#### Bugs fixed

- Improvements when things go wrong [#290](https://github.com/jupyterhub/configurable-http-proxy/pull/290) ([@minrk](https://github.com/minrk))

#### Documentation improvements

- changelog for 4.3 [#294](https://github.com/jupyterhub/configurable-http-proxy/pull/294) ([@minrk](https://github.com/minrk))

#### Maintenance and upkeep improvements

- Add tests for last-activity updates [#293](https://github.com/jupyterhub/configurable-http-proxy/pull/293) ([@minrk](https://github.com/minrk))
- adopt pre-commit [#291](https://github.com/jupyterhub/configurable-http-proxy/pull/291) ([@minrk](https://github.com/minrk))
- Bump commander from 6.2.1 to 7.1.0 [#289](https://github.com/jupyterhub/configurable-http-proxy/pull/289) ([@dependabot](https://github.com/dependabot))

#### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterhub/configurable-http-proxy/graphs/contributors?from=2021-02-20&to=2021-03-05&type=c))

[@dependabot](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3Adependabot+updated%3A2021-02-20..2021-03-05&type=Issues) | [@minrk](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3Aminrk+updated%3A2021-02-20..2021-03-05&type=Issues)

## 4.2

### [4.2.3] - 2021-02-19

#### Bugs fixed

- lib: Use client ssl config to access error target [#254](https://github.com/jupyterhub/configurable-http-proxy/pull/254) ([@chancez](https://github.com/chancez))

#### Documentation improvements

- docs: update release instructions and readme badges [#285](https://github.com/jupyterhub/configurable-http-proxy/pull/285) ([@consideRatio](https://github.com/consideRatio))

#### Continuous integration

- travis -> github actions [#275](https://github.com/jupyterhub/configurable-http-proxy/pull/275) ([@minrk](https://github.com/minrk))

#### Dependency bumps

- Bump ws from 7.4.2 to 7.4.3 [#288](https://github.com/jupyterhub/configurable-http-proxy/pull/288) ([@dependabot](https://github.com/dependabot))
- Bump ws from 7.4.1 to 7.4.2 [#282](https://github.com/jupyterhub/configurable-http-proxy/pull/282) ([@dependabot](https://github.com/dependabot))
- Bump ws from 7.4.0 to 7.4.1 [#280](https://github.com/jupyterhub/configurable-http-proxy/pull/280) ([@dependabot](https://github.com/dependabot))
- Bump ws from 7.3.1 to 7.4.0 [#273](https://github.com/jupyterhub/configurable-http-proxy/pull/273) ([@dependabot](https://github.com/dependabot))
- Bump commander from 6.2.0 to 6.2.1 [#281](https://github.com/jupyterhub/configurable-http-proxy/pull/281) ([@dependabot](https://github.com/dependabot))
- Bump commander from 6.1.0 to 6.2.0 [#271](https://github.com/jupyterhub/configurable-http-proxy/pull/271) ([@dependabot](https://github.com/dependabot))

#### Contributors to this release

[@chancez](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3Achancez+updated%3A2020-10-24..2021-02-19&type=Issues) | [@consideRatio](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3AconsideRatio+updated%3A2020-10-24..2021-02-19&type=Issues) | [@dependabot](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3Adependabot+updated%3A2020-10-24..2021-02-19&type=Issues) | [@minrk](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3Aminrk+updated%3A2020-10-24..2021-02-19&type=Issues)

### [4.2.2] - 2020-10-25

This release contains bugfixes, notably the `--custom-header` implementation.

#### Bugs fixed

- Emit proxyRequestWs events correctly, and some inline docs [#248](https://github.com/jupyterhub/configurable-http-proxy/pull/248) ([@consideRatio](https://github.com/consideRatio))
- fix: --custom-header flag implementation [#242](https://github.com/jupyterhub/configurable-http-proxy/pull/242) ([@consideRatio](https://github.com/consideRatio))
- Fix incorrect this/that on logging statement [#234](https://github.com/jupyterhub/configurable-http-proxy/pull/234) ([@jmartell7](https://github.com/jmartell7))

#### Maintenance and upkeep improvements

- Security patches of known vulnerabilities in docker image [#270](https://github.com/jupyterhub/configurable-http-proxy/pull/270) ([@wongannaw](https://github.com/wongannaw))
- try dependabot for updates [#256](https://github.com/jupyterhub/configurable-http-proxy/pull/256) ([@minrk](https://github.com/minrk))
- simplify dockerignore to exclude node_modules [#255](https://github.com/jupyterhub/configurable-http-proxy/pull/255) ([@minrk](https://github.com/minrk))
- CI: npm audit cronjob details [#246](https://github.com/jupyterhub/configurable-http-proxy/pull/246) ([@consideRatio](https://github.com/consideRatio))
- Docker image: use package-lock.json and only include relevant parts [#241](https://github.com/jupyterhub/configurable-http-proxy/pull/241) ([@consideRatio](https://github.com/consideRatio))
- CI: fix .travis.yml syntax for cronjob [#240](https://github.com/jupyterhub/configurable-http-proxy/pull/240) ([@consideRatio](https://github.com/consideRatio))
- CI: npm-audit cronjob in travis [#239](https://github.com/jupyterhub/configurable-http-proxy/pull/239) ([@consideRatio](https://github.com/consideRatio))
- CI: test against node 14 [#237](https://github.com/jupyterhub/configurable-http-proxy/pull/237) ([@consideRatio](https://github.com/consideRatio))
- Stop installing development dependencies in Docker image [#227](https://github.com/jupyterhub/configurable-http-proxy/pull/227) ([@consideRatio](https://github.com/consideRatio))

#### Documentation improvements

- Documentation changes #235 [#236](https://github.com/jupyterhub/configurable-http-proxy/pull/236) ([@suryag10](https://github.com/suryag10))

#### Dependency bumps

- Bump jasmine from 3.6.1 to 3.6.2 [#268](https://github.com/jupyterhub/configurable-http-proxy/pull/268) ([@dependabot](https://github.com/dependabot))
- Bump prettier from 2.1.1 to 2.1.2 [#266](https://github.com/jupyterhub/configurable-http-proxy/pull/266) ([@dependabot](https://github.com/dependabot))
- Bump request from 2.88.0 to 2.88.2 [#265](https://github.com/jupyterhub/configurable-http-proxy/pull/265) ([@dependabot](https://github.com/dependabot))
- Bump ws from 7.3.0 to 7.3.1 [#264](https://github.com/jupyterhub/configurable-http-proxy/pull/264) ([@dependabot](https://github.com/dependabot))
- Bump request-promise-native from 1.0.5 to 1.0.9 [#263](https://github.com/jupyterhub/configurable-http-proxy/pull/263) ([@dependabot](https://github.com/dependabot))
- Bump prettier from 2.0.0 to 2.1.1 [#262](https://github.com/jupyterhub/configurable-http-proxy/pull/262) ([@dependabot](https://github.com/dependabot))
- Bump nyc from 15.0.0 to 15.1.0 [#261](https://github.com/jupyterhub/configurable-http-proxy/pull/261) ([@dependabot](https://github.com/dependabot))
- Bump jasmine from 3.5.0 to 3.6.1 [#260](https://github.com/jupyterhub/configurable-http-proxy/pull/260) ([@dependabot](https://github.com/dependabot))
- Bump commander from 5.1.0 to 6.1.0 [#259](https://github.com/jupyterhub/configurable-http-proxy/pull/259) ([@dependabot](https://github.com/dependabot))
- Bump jshint from 2.10.2 to 2.12.0 [#258](https://github.com/jupyterhub/configurable-http-proxy/pull/258) ([@dependabot](https://github.com/dependabot))
- Bump winston from 3.3.0 to 3.3.3 [#257](https://github.com/jupyterhub/configurable-http-proxy/pull/257) ([@dependabot](https://github.com/dependabot))
- Update node Docker tag to v12.18.3 [#253](https://github.com/jupyterhub/configurable-http-proxy/pull/253) ([@renovate](https://github.com/renovate))
- Bump lodash from 4.17.15 to 4.17.19 [#250](https://github.com/jupyterhub/configurable-http-proxy/pull/250) ([@dependabot](https://github.com/dependabot))
- chore(deps): update dependency ws to v7 [#247](https://github.com/jupyterhub/configurable-http-proxy/pull/247) ([@renovate](https://github.com/renovate))
- Update dependency winston to ~3.3.0 [#245](https://github.com/jupyterhub/configurable-http-proxy/pull/245) ([@renovate](https://github.com/renovate))
- Update node Docker tag to v12.18.2 [#243](https://github.com/jupyterhub/configurable-http-proxy/pull/243) ([@renovate](https://github.com/renovate))
- Deps: npm audit fix to bump patch versions [#238](https://github.com/jupyterhub/configurable-http-proxy/pull/238) ([@consideRatio](https://github.com/consideRatio))
- Update node Docker tag to v12.17.0 [#233](https://github.com/jupyterhub/configurable-http-proxy/pull/233) ([@renovate](https://github.com/renovate))
- Update node Docker tag to v12.16.3 [#231](https://github.com/jupyterhub/configurable-http-proxy/pull/231) ([@renovate](https://github.com/renovate))
- Update dependency prettier to v2 [#230](https://github.com/jupyterhub/configurable-http-proxy/pull/230) ([@renovate](https://github.com/renovate))
- Update dependency commander to v5 [#229](https://github.com/jupyterhub/configurable-http-proxy/pull/229) ([@renovate](https://github.com/renovate))

#### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterhub/configurable-http-proxy/graphs/contributors?from=2020-03-11&to=2020-10-24&type=c))

[@consideRatio](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3AconsideRatio+updated%3A2020-03-11..2020-10-24&type=Issues) | [@dependabot](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3Adependabot+updated%3A2020-03-11..2020-10-24&type=Issues) | [@jmartell7](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3Ajmartell7+updated%3A2020-03-11..2020-10-24&type=Issues) | [@manics](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3Amanics+updated%3A2020-03-11..2020-10-24&type=Issues) | [@minrk](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3Aminrk+updated%3A2020-03-11..2020-10-24&type=Issues) | [@renovate](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3Arenovate+updated%3A2020-03-11..2020-10-24&type=Issues) | [@rgbkrk](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3Argbkrk+updated%3A2020-03-11..2020-10-24&type=Issues) | [@suryag10](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3Asuryag10+updated%3A2020-03-11..2020-10-24&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3Awelcome+updated%3A2020-03-11..2020-10-24&type=Issues) | [@wongannaw](https://github.com/search?q=repo%3Ajupyterhub%2Fconfigurable-http-proxy+involves%3Awongannaw+updated%3A2020-03-11..2020-10-24&type=Issues)

### [4.2.1] - 2020-03-11

#### Summary

This is a security release, fixing node package dependencies to
configurable-http-proxy, which itself was left untouched.

#### Merged PRs

- Security Fixes [#226](https://github.com/jupyterhub/configurable-http-proxy/pull/226) ([@rafael-ladislau](https://github.com/rafael-ladislau))
- Update dependency commander to ~4.1.0 [#225](https://github.com/jupyterhub/configurable-http-proxy/pull/225) ([@renovate](https://github.com/renovate))

### [4.2.0] - 2019-11-14

#### Summary

- Now terminates on `SIGTERM` as can be caused by `docker stop` or `kubectl delete`
- Add `--timeout` option to configure when to drop a request
- Add `--custom-header` option that enables proxied requests to get additional headers attached
- Support setting of the environment variable `CONFIGPROXY_AUTH_TOKEN` using a mounted file on the Docker image's container
- Node version bumped from 10 to 12.13.0 in the Docker image
- Various dependencies updated, including addressing security advisories from `npm audit` which do not affect CHP security itself.

#### Merged PRs

- RELEASE.md documentation and small fixes [#220](https://github.com/jupyterhub/configurable-http-proxy/pull/220) ([@consideRatio](https://github.com/consideRatio))
- Terminate on SIGTERM [#217](https://github.com/jupyterhub/configurable-http-proxy/pull/217) ([@consideRatio](https://github.com/consideRatio))
- Fix Vulnerabilities [#216](https://github.com/jupyterhub/configurable-http-proxy/pull/216) ([@rafael-ladislau](https://github.com/rafael-ladislau))
- Update dependency commander to v4 [#214](https://github.com/jupyterhub/configurable-http-proxy/pull/214) ([@renovate](https://github.com/renovate))
- chore: Udpate node, replace add with copy [#213](https://github.com/jupyterhub/configurable-http-proxy/pull/213) ([@jgwerner](https://github.com/jgwerner))
- Update dependency http-proxy to ~1.18.0 [#212](https://github.com/jupyterhub/configurable-http-proxy/pull/212) ([@renovate](https://github.com/renovate))
- Change user to numeric value for k8s compatibility [#211](https://github.com/jupyterhub/configurable-http-proxy/pull/211) ([@m2hofi94](https://github.com/m2hofi94))
- Add file_env function to set the token env var [#209](https://github.com/jupyterhub/configurable-http-proxy/pull/209) ([@rcthomas](https://github.com/rcthomas))
- Allow setting request timeout [#208](https://github.com/jupyterhub/configurable-http-proxy/pull/208) ([@archite](https://github.com/archite))
- Command line option for custom headers [#206](https://github.com/jupyterhub/configurable-http-proxy/pull/206) ([@ivan-gomes](https://github.com/ivan-gomes))
- chore(deps): update dependency nyc to v14 [#202](https://github.com/jupyterhub/configurable-http-proxy/pull/202) ([@renovate](https://github.com/renovate))
- Update dependency commander to ~2.20.0 [#201](https://github.com/jupyterhub/configurable-http-proxy/pull/201) ([@renovate](https://github.com/renovate))

### [4.1]

### [4.1.0] - 2019-04-01

- Add `--redirect-to` option to specify destination port when redirecting
  http to https with `--redirect-from`.
- Add health check endpoint at `/_chp_healthz`.
- Docker base image is updated to `node/10-alpine` from `node/6-alpine`
- Dependencies are updated via Renovate

## 4.0

### [4.0.0] - 2018-10-12

- Add support for client SSL certificates for encrypting proxied requests.
- Update all nodejs dependencies. Most significant is updating winston (logging) from 2 to 3. There is no longer a global logger,
  instead use `this.log`.
- Drop support for node 4. Minimum node version is 6.
- Support CONFIGPROXY_SSL_KEY_PASSPHRASE env for setting the passphrase of ssl keys (API_SSL for api ssl key).

## [3.1]

### [3.1.1] - 2018-01-15

- Fix a bug when using the new custom storage backend support
  where the body of requests could be lost.

### [3.1.0] - 2017-11-03

3.1 adds two new features:

- Add `--change-origin` passthrough for node-http-proxy's changeOrigin option.
- Add support via `--storage-backend <storage-class>` for custom storage classes.
  See [configurable-http-proxy-redis-backend](https://github.com/globocom/configurable-http-proxy-redis-backend)
  for an example using redis.

## [3.0]

### [3.0.0] - 2017-09-19

3.0 is a major release because much of the code has been reorganized
to adopt some javascript standards:

- Use ES6 and Promises instead of ES5 and callbacks,
  which we can do without a compiler because CHP 2.0 required nodejs < 4.
- auto-format code with prettify (run `npm run fmt` to auto-format your code after making changes).

There shouldn't be any major changes in 3.0, but marking it as a major upgrade because
there could be regressions introduced by the restructuring.

Fixes:

- Fix routing of `/prefix?query` where a query parameter was passed
  exactly on the routing prefix with no trailing slash.

Improvements:

- Quieter messages for ECONNREFUSED and ECONNRESET,
  which are generally not indicative of problems,
  but rather common events of peers disconnecting during a request.
- The docker image for `jupyterhub/configurable-http-proxy`
  is now based on `node:6-alpine`.

## [2.0]

### 2.0.4 - 2017-06-21

- Add logging of all API requests

### 2.0.3 - 2017-06-12

- Fix docker image entrypoint, broken in 2.0.2

### 2.0.2 - 2017-06-07

- Fix error raised trying to `setHeader` on an undefined response (e.g. when encountering socket-level error)

### 2.0.1

**Important** CHP 2.0.0 drops support for node.js ≤ 4.0.

**Added:**

- Add configuration option for proxy timeout `--proxy-timeout <n>, Timeout (in millis) when proxy receives no response from target.`
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
- Improved all-interfaces warning message when `ip='*'` [\#94](https://github.com/jupyterhub/configurable-http-proxy/pull/94)

## [1.3]

### [1.3.1] - 2016-10-12

- small fixes for node 6 support
- fix `--no-x-forward` again (for real, this time)

### [1.3.0] - 2016-08-01

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

## [0.1.1] - 2014-10-01

[unreleased]: https://github.com/jupyterhub/configurable-http-proxy/compare/4.5.0...HEAD
[4.5.0]: https://github.com/jupyterhub/configurable-http-proxy/compare/4.4.4...4.5.0
[4.4.4]: https://github.com/jupyterhub/configurable-http-proxy/compare/4.3.2...4.4.4
[4.3.2]: https://github.com/jupyterhub/configurable-http-proxy/compare/4.3.1...4.3.2
[4.3.1]: https://github.com/jupyterhub/configurable-http-proxy/compare/4.3.0...4.3.1
[4.3.0]: https://github.com/jupyterhub/configurable-http-proxy/compare/4.2.3...4.3.0
[4.2.3]: https://github.com/jupyterhub/configurable-http-proxy/compare/4.2.2...4.2.3
[4.2.2]: https://github.com/jupyterhub/configurable-http-proxy/compare/4.2.1...4.2.2
[4.2.1]: https://github.com/jupyterhub/configurable-http-proxy/compare/4.2.0...4.2.1
[4.2.0]: https://github.com/jupyterhub/configurable-http-proxy/compare/4.1.0...4.2.0
[4.1.0]: https://github.com/jupyterhub/configurable-http-proxy/compare/4.0.1...4.1.0
[4.0.0]: https://github.com/jupyterhub/configurable-http-proxy/compare/3.1.1...4.0.1
[3.1.1]: https://github.com/jupyterhub/configurable-http-proxy/compare/3.1.0...3.1.1
[3.1]: https://github.com/jupyterhub/configurable-http-proxy/compare/3.0.0...3.1.0
[3.0]: https://github.com/jupyterhub/configurable-http-proxy/compare/2.0.4...3.0.0
[2.0]: https://github.com/jupyterhub/configurable-http-proxy/compare/1.3.1...2.0.4
[1.3]: https://github.com/jupyterhub/configurable-http-proxy/compare/1.2.0...1.3.0
[1.2]: https://github.com/jupyterhub/configurable-http-proxy/compare/1.1.0...1.2.0
[1.1]: https://github.com/jupyterhub/configurable-http-proxy/compare/1.0.0...1.1.0
[1.0]: https://github.com/jupyterhub/configurable-http-proxy/compare/0.5.0...1.0.0
[0.5]: https://github.com/jupyterhub/configurable-http-proxy/compare/0.4.0...0.5.0
[0.4]: https://github.com/jupyterhub/configurable-http-proxy/compare/0.3.0...0.4.0
[0.3]: https://github.com/jupyterhub/configurable-http-proxy/compare/0.2.1...0.3.0
[0.2.1]: https://github.com/jupyterhub/configurable-http-proxy/compare/0.2.0...0.2.1
[0.2.0]: https://github.com/jupyterhub/configurable-http-proxy/compare/0.1.1...0.2.0
