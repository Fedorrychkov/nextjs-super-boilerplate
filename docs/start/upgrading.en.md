# Updating a fork and checking a release

The template and the product evolve separately. Choose a reviewed revision, apply
it on a working branch and inspect the diff. A fix in develop does not mean the
published demo is running it.

## Before updating

1. Commit your work and record the application's known working revision.
2. Read the changelog and decisions for the selected update. Check environment
   additions, data changes, feature flags and dependency compatibility.
3. Have a verified backup before data changes. Updating source does not authorise
   production migrations or database restores.

For an ordinary Git fork, add the template repository as upstream and fetch its
history. Cherry-pick the reviewed commits on a separate branch, or prepare a merge
of the selected revision and resolve conflicts explicitly. Preserve and review
product.ts, authentication settings and infrastructure configuration rather than
replacing them with the demo's values.

A git-subtree monorepo needs its own update procedure. Do not rerun init-project.sh
or merge the template root into the monorepo root as if it were an ordinary fork.

## Checks

```bash
pnpm install --frozen-lockfile
pnpm gates
pnpm lint
pnpm typecheck
pnpm test
```

Run the local app and exercise the affected paths: sign-in, public pages, editing
and publishing, uploads and integrations. Choose the checks from the diff; test
a local build separately. Unit tests do not verify live OAuth providers, email delivery,
payments or external infrastructure.

## Releasing this repository's demo

Feature PRs target develop. The owner reviews a develop → main release PR.
The current prod-deploy.yml deploys on pushes to main except for its documented
path exclusions; workflow_dispatch is also a deployment. Opening a PR does not
deploy it. A fork must review its own workflow triggers and secrets.

After deployment, check the domain and the actual fixed behaviour. For example,
a request with the artificial cookie accessToken=local-canary must not echo it
in a response Authorization header; named robots groups must retain private-path
restrictions. Never use real tokens in these checks or publish cookies.

## If behaviour differs

Check the deployed revision, the deployment job and the domain configuration.
Do not automatically rerun migrations or restore MongoDB. Application rollback
and data rollback are separate operations with different consequences.

See [getting started](getting-started.en.md), [local development](local-development.en.md)
and [deployment](../deploy/github-actions.en.md).
