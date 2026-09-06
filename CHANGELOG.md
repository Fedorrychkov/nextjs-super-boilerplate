# Changelog

## [Unreleased]

Audit of the boilerplate against downstream projects (mcrypto-superweb, vpn-saas-super, vrs, banking-future-mvp) — see [`docs/audits/2026-09-boilerplate-vs-children.ru.md`](docs/audits/2026-09-boilerplate-vs-children.ru.md). Ported back:

### CI & notifications

- **Telegram notifications for repository life** (`notify-telegram.yml` + `scripts/telegram/`) — PR opened / ready / review requested / review left / merged, CI or Secret scan failed (via `workflow_run`, so forks and new jobs are covered). Pure text formatters with unit tests in `pnpm test`; no dependencies (sparse checkout). Draft PRs, pushes to open PRs, green runs and concurrency cancellations are deliberately silent
- **Lighthouse budgets for public pages** (`lighthouse.yml`, `lighthouserc.json`) — `/`, `/articles`, `/login` against a live `next start` with an empty Mongo; weight and CLS block, timings warn; results in the step summary and in Telegram
- **Secret scan** (`ci-secret-scan.yml`) — gitleaks over the tracked tree on every PR/push, no paths filter
- **Gates** (`pnpm gates`, `scripts/gates.mjs`) — runs every `scripts/check-*.mjs` and prints one table; added to the `quality` matrix. Ships with `check-agent-contract` (AGENTS.md ≤ 28 KB, no `@file` imports, thin `CLAUDE.md`) and `check-eslint-disable-ratchet` (`scripts/lib/ratchet.mjs`)
- `scripts/notify-telegram.sh` — deploy notification no longer fails silently: commit message is HTML-escaped (a `Co-Authored-By: … <mail>` trailer used to be parsed as a tag → 400), body is URL-encoded, the Bot API answer is checked (`::warning` on refusal), `TG_DRY_RUN=1` prints instead of sending, multi-domain `TG_DOMAIN` uses the first entry
- PR template (`.github/PULL_REQUEST_TEMPLATE.md`)

### Deploy hardening

- **Public env in Variables** — new input `env_public` (caller passes `${{ vars.WEB_ENV_PUBLIC_PROD }}`); appended after the secret, overlaps printed by name, credential-looking names in Variables fail the deploy; CRLF stripped with a warning (`admin\r` once created a Mongo root user nobody could log in as)
- **Doctor gate before deploy** — `doctor_check_enabled` runs `pnpm doctor:<env>` on the assembled env file in CI
- `pnpm doctor` — sibling-container topology checks (`config/container-topology.ts`, unit-tested): `localhost` in `MONGO_URI` / `REDIS_URL` with `MONGO_ENABLED` / `REDIS_ENABLED`, missing credentials / `authSource=admin` when `MONGO_USER` is set
- `scripts/local-containers-run.sh` — data stores start first and are awaited healthy, then the api; one `wait_for_container_healthy` with a 300 s budget that prints `docker logs --tail=200` on failure (was 60 s and silent); a refused `docker pull` in registry mode stops the deploy instead of falling back to an 8-minute build on the server
- `scripts/lib/deploy-utils.sh` — `load_env_into_shell` strips CR
- `scripts/lib/memory-limits.sh` — Grafana gets 43 % of the metrics budget (Grafana 13 runs the Loki datasource as a separate process and peaks at ~450 MB; at 29 % it was OOM-killed twice a minute), Prometheus drops to 14 %
- `docker-compose.local.yml` — Grafana pinned to `13.2.1` (the budget is tuned to this major), analytics / update checks disabled

### Agent workflow

- **`CLAUDE.md`** — thin Claude Code adapter that imports `AGENTS.md`; **`.claude/settings.json`** with a `PreToolUse` gate (`scripts/guard-external.sh`, fail-closed: `git push`, `.env.prod` / `.env.stage`, Mongo restore) and a read-only allow-list
- `AGENTS.md` / `AGENTS_RU.md` — working rules: priority ladder, size the work, "done and enough", tests, what CI already catches, documentation discipline
- `docs/agents/review.ru.md`, `docs/agents/triage.ru.md`, `docs/decisions/journal.ru.md` (decision journal), `docs/plans/README.md`
- `scripts/setup-local.sh` / `make setup` — repeatable local onboarding (tops up new keys from `.env.example`, fills only empty values, ends with `pnpm doctor`); `init-project.sh` stays the one-shot fork step
- `.gitignore` — agent runtime files (`.claude/*.local.json`, `.mcp.json`, `.playwright-mcp/`, …)

### Documentation & env layer

- **`docs/` reorganised by topic** — `start / configure / deploy / develop / security / agents / decisions / plans / audits / roadmaps`, language as a suffix (`.ru.md` / `.en.md`; RU canonical, EN for entry documents). Every reference in code, scripts, workflows and docs rewritten; `check-docs-structure` gate enforces the naming, index coverage and live relative links
- **README shrunk to an entry page** (quick start, docs table, commands); the deploy / VPS / troubleshooting / bundle sections moved to `docs/deploy/github-actions.en.md`, `docs/start/local-development.en.md`, `docs/develop/bundle-optimization.en.md`
- **`.env.example` regrouped** into the same sections as `docs/configure/env-reference.{ru,en}.md` (new EN version), one-line comments only, `NEXT_PUBLIC_LLM_ENABLED=false` instead of the `true|false` placeholder, `WORKER_HEARTBEAT*` as real keys; `check-env-reference` gate keeps template and reference in parity by name
- `docs/start/getting-started.{ru,en}.md` rewritten around `init-project.sh` (fork, once) + `make setup` (repeat onboarding) + `pnpm doctor`

## [0.3.0] — 2026-07-18

### Infrastructure & tooling

- **Background worker (`scripts/worker.ts` + `lib/services/worker-scheduler.ts`)** — optional headless BullMQ container for periodic jobs (generic job registry, repeatable-job schedules with stale cleanup, `removeOnComplete/removeOnFail`, dedicated Redis connection). Enabled per environment via `worker_enabled` / `WORKER_ENABLED`; ships with a gated `heartbeat` example job. See [`docs/deploy/background-worker.ru.md`](docs/deploy/background-worker.ru.md)
- **Mongo backups (local mongo)** — nightly `mongodump` via `scripts/backup-mongo.sh` (throwaway container with CPU/RAM caps, rotation, disk guard, integrity check) + `scripts/restore-mongo.sh`; cron installed/removed by the deploy (`mongo_backup_enabled` / `mongo_backup_cron` / `mongo_backup_retention`, auto-off when `mongo_enabled: false`). See [`docs/deploy/mongo-backups.ru.md`](docs/deploy/mongo-backups.ru.md)
- **Mongo observability** — Grafana `mongo service` + `mongo slow queries` log panels; Loki retention via `compactor` (`retention_period: 168h`)
- **Docker Compose v1↔v2 compatibility** — deploy scripts, `Makefile` and CI auto-detect `docker compose` / `docker-compose`; explicit `container_name` for promtail/loki/grafana; `version:` removed from compose files. See [`docs/deploy/docker-compose-v2.ru.md`](docs/deploy/docker-compose-v2.ru.md)
- **Toggled-off cleanup on deploy** — flipping `metrics_enabled` / `worker_enabled` to false now stops the leftover `restart: always` containers instead of leaving them running on a stale image
- **`scripts/init-project.sh`** — one-shot fork bootstrap: renames placeholders, generates `JWT_SECRET` / `MFA_ENCRYPTION_KEY` / `SEO_NOTIFY_SECRET` / VAPID into `.env.local`, guard file `.project-initialized`, runs `pnpm doctor`
- `doctor` now validates worker/Redis consistency (`WORKER_ENABLED` without `REDIS_URL`)

### UI

- **Profile page tabs** — profile split into `main` / `devices` / `security` tabs (`TabsContainer` with `?activeTab=` deep-linking); onboarding card/modal navigate to the matching tab + anchor

### Fixes

- **Upstream 502** — `apiErrorHandlerContainer` returns 502 `UPSTREAM_UNREACHABLE` when an outbound request never gets a response, instead of silently answering 200 with an empty body

### MCP & machine auth

- **Personal Access Tokens (PAT)** — `ApiToken` model (sha256 hash, scopes, expiry, revoke), `withApiTokenOrAuth` middleware with per-token rate limit and `SecurityAuditLog` audit; feature flag `API_TOKENS_ENABLED`
- **Admin UI `/admin/api-tokens`** — create (raw token shown once), scopes, expiry, revoke
- **MCP stdio server (`mcp/`)** — articles + media tools for MCP hosts (Claude Desktop, Cursor, Claude Code); Markdown → TipTap conversion; extensible per-domain registry (`mcp/tools/*.mcp.ts`); `pnpm mcp`
- Article/media/SEO routes accept PAT with scopes `articles:read|write|publish|seo`, `media:read|write`; publish/unpublish transitions gated by `articles:publish` (draft-first agents by default)
- **Role policies for PAT/MCP** — `ApiTokenRolePolicy` model + admin UI: allow any role (including future downstream roles — stored as plain strings) to issue tokens with per-role scopes and max lifetime; enforced on every PAT request, so disabling a role or narrowing scopes cuts off existing tokens instantly; owner demotion re-caps the token role at verify time
- **Self-service tokens `/profile/api-tokens`** — allowed roles see "My API tokens" in the nav: own tokens only, creation limited by the role policy, revoke, MCP host setup instructions (config templates for Claude Desktop / Cursor / Claude Code) shown on both admin and user pages
- `GET /api/v1/api-token/permissions`, `GET /api/v1/api-token/policy/list`, `PUT /api/v1/api-token/policy/update`; `api_token_policy_updated` audit action
- MCP `publish_article` made failure-safe: the revision is confirmed before the article flips to `published`, with a retry hint on partial failure
- Unit tests for the pure permission logic (`src/api/api-token/permissions.test.ts`)
- **Reader view for article reads** — `article/list`, `article/get-by-slug` and `article-revision/get` no longer hard-403 non-staff roles: admin/editor keep full access (drafts, history, filters), any other authenticated role (JWT or user-role PAT) gets the reader scope — published+public feed enriched with title/description, published articles by slug, and only the current confirmed revision of a published article (drafts/history answer 404, not 403, to avoid existence leaks); per-article `allowedRoles` respected. User agents can build digests with quotes via MCP using a plain `articles:read` token
- **Remote MCP endpoint `POST /api/mcp`** — Streamable HTTP in stateless JSON mode: platform users connect with a URL + PAT, no repo checkout; shares the tool registry with the stdio server via a transport-agnostic dispatcher (`mcp/handler.ts`, unit-tested); early 401 for invalid tokens; `MCP_SERVER_NAME` env brands `serverInfo.name` per project (default `nsb-mcp`); setup instructions in the UI now show the remote config as the primary flow (with `npx mcp-remote` bridge for stdio-only hosts)

## [0.2.0] — 2026-06-06

### Account & security

- Password change (profile) and forgot-password flows with strict/flexible recovery matrix
- Admin account recovery (MFA reset, set password)
- Active sessions UI with revoke; access JWT bound to refresh session (`sid`) for immediate invalidation
- Post-login onboarding modal + profile checklist; versioned dismiss
- iOS PWA push hint
- Security audit log and `NOTIFY_PASSWORD_*`
- Centralized password policy (`config/password-policy.ts`)

### Configuration & DX

- **`config/product.ts`** — single source for product name, author, links, PWA, sitemap extras
- **Dynamic manifest** — `src/app/manifest.ts` (replaces static `site.webmanifest` in layout)
- **Route SEO metadata** — `src/constants/routes.ts` drives sitemap and breadcrumbs
- Optional author in JSON-LD and article pages (`author: null` in product config)
- **`pnpm doctor`** — env and feature-flag validation
- Docs: `docs/start/getting-started.ru.md`, `docs/configure/feature-flags.ru.md`, `docs/configure/env-reference.ru.md`

### Docs

- Updated `docs/security/account-security.ru.md` (phases 1–5 implemented)

---

## [0.1.x] — earlier

- Auth, articles CMS, SEO baseline, deploy stack, LLM editor, notifications — see git history and product roadmaps.
