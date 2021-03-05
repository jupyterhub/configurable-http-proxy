# How to make a release

`configurable-http-proxy` is available as a _npm package_ [available on
npmjs](https://www.npmjs.com/package/configurable-http-proxy) and a _Docker
image_ available on
[DockerHub](https://hub.docker.com/r/jupyterhub/configurable-http-proxy). The
Docker image is automatically built and published on changes to the git
repository as is configured
[here](https://hub.docker.com/repository/docker/jupyterhub/configurable-http-proxy/builds).

To make a tagged release follow the instructions below, but first make sure you
meet the prerequisites:

- To have push rights to the [configurable-http-proxy GitHub
  repository](https://github.com/jupyterhub/configurable-http-proxy).
- To have [`bump2version`](https://github.com/c4urself/bump2version) installed
  (`pip install bump2version`).

## Steps to make a release

1. Update [CHANGELOG.md](CHANGELOG.md) if it is not up to date, and verify
   [README.md](README.md) has an updated output of running `--help`. Make a PR
   to review the CHANGELOG notes.

1. Once the changelog is up to date, checkout master and make sure it is up to
   date and clean.

   ```bash
   ORIGIN=${ORIGIN:-origin} # set to the canonical remote, e.g. 'upstream' if 'origin' is not the official repo
   git checkout master
   git fetch $ORIGIN master
   git reset --hard $ORIGIN/master
   # WARNING! This next command deletes any untracked files in the repo
   git clean -xfd
   ```

1. Update the version with `bump2version` to not include the -dev suffix and let
   it make a git commit and tag as well for us.

   ```bash
   # optionally first bump a minor or major version, but
   # don't bump the patch version, that's already done.
   # bump2version --no-commit minor
   # bump2version --no-commit major
   bump2version --tag release

   # verify changes
   git diff HEAD~1
   ```

1. Reset the version to the next development version with `bump2version`.

   ```bash
   bump2version --no-tag patch

   # verify changes
   git diff HEAD~1
   ```

1. Push your release related commits to master along with the annotated tags
   referencing commits on the master branch.

   ```
   git push --follow-tags $ORIGIN master
   ```

1. Visit [GitHub: create new
   release](https://github.com/jupyterhub/configurable-http-proxy/releases/new)
   and reference your tag.

   This will trigger a workflow to publish the NPM package.

1. Verify [the automated
   workflow](https://github.com/jupyterhub/configurable-http-proxy/actions?query=workflow%3A%22Publish+to+npm%22)
   succeeded.

## Manual release to npm

1. Verify you are a collaborator of the [npmjs
   project](https://www.npmjs.com/package/configurable-http-proxy).

1. Checkout the git tag.

   ```
   git checkout <tag>
   ```

1. Cleanup old node_modules etc.

   ```
   git clean -xfd
   ```

1. Publish to NPM.

   ```bash
   npm login
   npm publish
   ```
