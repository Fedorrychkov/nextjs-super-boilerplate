# Minimal production-ready template for a Next.js app

## Introduction

I'm a full-stack developer and have been doing web development since around 2014. In recent years I've been focusing more on in-house projects, freelance work, and my own micro-products. A constant pain point is the lack of a convenient, ideally free, way to spin up yet another project for a task without getting bogged down in infrastructure.

Over several years I've brought a few things to a solid, reusable state:

- Automated deploy to a server (including blue/green);
- Issuing and renewing SSL certificates for the domain;
- A minimal metrics stack (Grafana, Prometheus, Loki, etc.) — optional, controlled by flags.

The result is two battle-tested boilerplates: Nest.js and Next.js. In this article I'm sharing the second one. To keep infrastructure simple, the template is built around a single stack: Next.js, auth, and database access within one application.

This kind of template may not be anything new, but if it saves someone a few hours on deploy and environment setup, I'll be glad.

## From idea to release

Most developers want to take an idea to a working product — a side project, a micro-product, an internal service. I'll speak from my own experience: everyone's context and goals are different.

A lot can be built today with AI and ready-made tutorials. Getting a product to a stable release without getting stuck on infrastructure is another story. That's why I published this standalone Next.js template: deploy, certificates, and optional metrics are already wired in. You can use it as a base and focus on your app logic.

You're free to do whatever you want with the template: it's open. The repo includes the essentials — auth, cookies, database, scripts, and workflows for your server.

## What's inside

The template is built for one scenario: one repo, one stack (Next.js + API routes + DB and sessions when needed). No separate infra “admin” layer — everything is driven by config and flags in GitHub Actions.

**Deploy and environments**

- Workflows for stage and prod (separate files under `.github/workflows/`), with shared logic in a reusable workflow.
- Support for “build on server” and “image from GHCR”; optionally blue/green (with some caveats).
- Deploy triggers on push to the right branch; only the containers you need are started on the server.

**Certificates and nginx**

- Let's Encrypt via certbot: initial issuance and renewal.
- Nginx as the single entry point: proxy to Next.js, and when metrics are enabled, a subpath for Grafana. The nginx config is generated from templates using the `METRICS_ENABLED` flag: when metrics are off, Grafana blocks are omitted, so nginx doesn't depend on the Grafana container.

**Optional parts**

- **Redis** — started only when `redis_enabled: true` in the workflow config.
- **Metrics (Grafana, Prometheus, Loki, Telegraf, Promtail, etc.)** — only when `metrics_enabled: true`. Both flags are off by default: only nginx and the app are always run.
- **Mongo** — is only started when `mongo_enabled: true` is set in the workflow config. This database comes as the default in the template for now. You can always remove or skip the parts related to internal DB logic for the Next.js app, especially if you want to separate the final backend from the client application logic.

So you can start with the minimum (app + nginx + certificates) and turn on cache and dashboards with a single change in `stage-deploy.yml` / `prod-deploy.yml`.

**Auth and database**

- The repo includes a minimal layer for auth and DB access within Next.js (API routes, cookies, sessions). If you need a separate backend, you can keep the same workflows and scripts and adapt the logic in `app/api/[...]/route` and deploy flags to your setup.

## Who might find this useful

Best fit: pet projects, internal services, and MVPs. Anyone who wants to get an idea to production quickly without diving deep into DevOps: one repo, clear flags, one server. And anyone already comfortable with Next.js who wants a ready-made base with deploy and optional metrics — with no extra services by default.

Repo: [nextjs-super-boilerplate](https://github.com/Fedorrychkov/nextjs-super-boilerplate). If this approach fits you, feel free to use the template as a base for your next project or a quick release; I’d appreciate a star and feedback. Please do open issues if you run into problems or find bugs in the core setup.

## Beyond the deploy template

The repo isn't just configs and scripts: it includes a full client app example. You get a cabinet-style flow with auth — email/password login, sign-up, protected routes, profile fetched from the server, and session handling via cookies. You can use it as a reference or as the starting point for your product.

There's also a small UI kit in the codebase: buttons, inputs, typography, sidebar, badges, and other reusable components. They're used on the example pages (including a UI Kit demo page) and keep the look consistent. If you're on React and Next.js, you can build on this set and tweak it to your design instead of starting the UI from scratch.

## For those who read to the end

### How to use it

A few options:

**Clone**

```bash
git clone https://github.com/Fedorrychkov/nextjs-super-boilerplate.git your-project-name
```

You keep the existing git history; then set your own `origin` (your new repo) and push there.

**Fork**

Open the [repository](https://github.com/Fedorrychkov/nextjs-super-boilerplate) and click **Fork**. You get a copy under your account that you can work on and push to.

**Use as template**

On the repo page, click **Use this template** (next to Fork). GitHub creates a new repo under your account with no commit history — a clean start for your project.

### Local setup

I use pnpm locally, but npm and yarn should work the same. Docker configs use npm. The repo has no package-lock — only pnpm-lock.yaml.

After cloning or creating a repo from the template:

1. Install dependencies: `pnpm install` (or `npm install` / `yarn`).
2. Copy `.env.example` to `.env.local` and set your values (JWT, MongoDB, etc.) if needed.
3. For local MongoDB in a container: `make up-local` (starts mongo from `docker-compose.dev.yml`). Use the connection settings from `.env.local` (e.g. `MONGO_HOST=localhost` when the app runs on the host).
4. Start the dev server: `pnpm run dev:local` (or `npm run dev:local`). The app will be at the URL shown (usually http://localhost:3000).

To stop local mongo: `make down-local`.

Instead of local Mongo (both in dev and on servers) you can use an external cluster: set the full connection string in `MONGO_URI`. On deploy, set `mongo_enabled: false` in the workflow so the mongo container is not started.

### GitHub Workflows config parameters

Parameters are set in `stage-deploy.yml` and `prod-deploy.yml` and passed into the shared `reusable-deploy-config.yml`.

**Inputs (with)**

- **domain** — Domain the app is deployed to (e.g. `app.example.com`). Used by nginx and certbot.
- **api_env** — App environment: `stage`, `prod`. Used in env vars and env file names.
- **env_file** — Path to the env file on the server (e.g. `.env.stage`, `.env.prod`). Secrets are appended to this file during deploy.
- **nginx_mode** — nginx mode: `http` or `https`. Chooses which config template and certificates are used.
- **certbot_test_mode** — Use Let's Encrypt staging server. Useful for testing without rate limits.
- **migrations_run** — Run DB migrations on deploy. Not needed if you don't use DB migrations in the project.
- **blue_green_enabled** — Enable blue/green deploy (spin up a green copy, validate, then switch with minimal downtime).
- **deploy_mode** — Build strategy: empty/`default` = build on server; `registry` = build in CI, push image to GHCR, server only pulls.
- **node_version** — Node.js version used in GitHub Actions (e.g. 24). Set the same version in [.docker/Dockerfile](https://github.com/Fedorrychkov/nextjs-super-boilerplate/blob/main/.docker/Dockerfile) (currently 24.13.1).
- **registry_subname** — Name fragment for the GHCR image (e.g. `web` → `ghcr.io/owner/web:sha`).
- **notigy_enabled** — Send Telegram notifications on deploy start/success/failure. You must provide bot token, chat id and optionally thread id. For groups/supergroups the id must be prefixed with `-100`.
- **tag** — Optional tag for Telegram messages (e.g. project or environment name).
- **redis_enabled** — Start the Redis container. If `false`, redis is not started.
- **metrics_enabled** — Start the metrics stack (Prometheus, Grafana, Loki, Telegraf, Promtail, etc.). If `false`, nginx does not depend on Grafana.
- **mongo_enabled** — Start the MongoDB container. If `false`, an external cluster is expected (connection via `MONGO_URI` in env).
- **certbot_email** — Email for Let's Encrypt.
- **grafana_admin_user**, **grafana_admin_password** — Grafana admin login and password (when metrics are enabled).

**Secrets**

- **server_host**, **server_username**, **server_password** — Host, username and password for SSH to the deploy server.
- **env** — Env file contents (environment variables) appended to `env_file` on the server. Usually different secrets for stage and prod.
- **database_certificate** — Optional: DB certificate or key if you use a separate file.
- **ghcr_username**, **ghcr_token** — Login and token for GitHub Container Registry; required when `deploy_mode: registry`.
- **tg_token**, **tg_chat_id**, **tg_thread_id** — Bot token, chat id and optional thread id for Telegram notifications.
- **grafana_admin_user**, **grafana_admin_password** — Can be passed as secrets instead of plain values in `with`.

For the full list and definitions see [reusable-deploy-config.yml](https://github.com/Fedorrychkov/nextjs-super-boilerplate/blob/main/.github/workflows/reusable-deploy-config.yml).

## Thanks for reading

I'm not claiming this is a one-size-fits-all solution, but I hope the template and configs help you ship ideas faster. Keep in mind: the setup isn't aimed at high load; use proper DB indexes. Auto-deploy can be tricky sometimes — e.g. when rebuilding existing containers or issuing certificates for the first time.

Your VPS must be reachable from the internet: ensure the firewall allows ports 22, 80 and 443. You need to own or get a domain and point its DNS A record to the server IP. The template doesn't support using your own SSL certificates yet — only Let's Encrypt issuance is wired in.

If the template was useful, a star on the [repo](https://github.com/Fedorrychkov/nextjs-super-boilerplate) is appreciated. If something breaks, open an [issue](https://github.com/Fedorrychkov/nextjs-super-boilerplate/issues) and I'll try to help. Good luck!
