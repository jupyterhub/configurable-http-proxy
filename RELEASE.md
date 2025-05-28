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
- To have [Node.js](https://nodejs.org) installed.

## Steps to make a release

1. Update [CHANGELOG.md](CHANGELOG.md) if it is not up to date, and verify
   [README.md](README.md) has an updated output of running `--help`. Make a PR
   to review the CHANGELOG notes.

1. Once the changelog is up to date, checkout the main branch and make sure it is up to
   date and clean.

   ```bash
   ORIGIN=${ORIGIN:-origin} # set to the canonical remote, e.g. 'upstream' if 'origin' is not the official repo
   git checkout main
   git branch --set-upstream-to=$ORIGIN/main main
   git pull
   ```

1. Update the version with [`npm version`](https://docs.npmjs.com/cli/v6/commands/npm-version)
   and let it make a git commit and tag as well for us.

   ```bash
   # specify the new version here,
   # which should already have been chosen when updating the changelog.
   npm version 1.2.3

   # verify changes
   git diff HEAD~1
   ```

1. Reset the version to the next development version with `npm version`,
   without creating a tag:

   ```bash
   npm version --no-git-tag-version prerelease --preid=dev
   git commit -am "back to dev"

   # verify changes
   git diff HEAD~1
   ```

1. Push your new tag and commits to GitHub.

   ```bash
   git push --atomic --follow-tags $ORIGIN main
   ```

1. Verify [the automated
   workflow](https://github.com/jupyterhub/configurable-http-proxy/actions?query=workflow%3A%22Publish+to+npm%22)
   succeeded.

## Manual release to npm

A manual release should not generally be required,
but might be needed in the event of a problem in the automated publishing workflow.

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
