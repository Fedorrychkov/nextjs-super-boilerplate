# Changelog

## [Unreleased]

### Infrastructure & tooling

- **Background worker (`scripts/worker.ts` + `lib/services/worker-scheduler.ts`)** — optional headless BullMQ container for periodic jobs (generic job registry, repeatable-job schedules with stale cleanup, `removeOnComplete/removeOnFail`, dedicated Redis connection). Enabled per environment via `worker_enabled` / `WORKER_ENABLED`; ships with a gated `heartbeat` example job. See [`docs/CRON_ARCHITECTURE_PORTABLE_RU.md`](docs/CRON_ARCHITECTURE_PORTABLE_RU.md)
- **Mongo backups (local mongo)** — nightly `mongodump` via `scripts/backup-mongo.sh` (throwaway container with CPU/RAM caps, rotation, disk guard, integrity check) + `scripts/restore-mongo.sh`; cron installed/removed by the deploy (`mongo_backup_enabled` / `mongo_backup_cron` / `mongo_backup_retention`, auto-off when `mongo_enabled: false`). See [`docs/MONGO_BACKUPS_RU.md`](docs/MONGO_BACKUPS_RU.md)
- **Mongo observability** — Grafana `mongo service` + `mongo slow queries` log panels; Loki retention via `compactor` (`retention_period: 168h`)
- **Docker Compose v1↔v2 compatibility** — deploy scripts, `Makefile` and CI auto-detect `docker compose` / `docker-compose`; explicit `container_name` for promtail/loki/grafana; `version:` removed from compose files. See [`docs/DOCKER_COMPOSE_V2_RU.md`](docs/DOCKER_COMPOSE_V2_RU.md)
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
- Docs: `GETTING_STARTED.md`, `CONFIGURATION.md`, `ENV_REFERENCE.md`

### Docs

- Updated `SECURITY_AND_ACCOUNT_ROADMAP.md` (phases 1–5 implemented)

---

## [0.1.x] — earlier

- Auth, articles CMS, SEO baseline, deploy stack, LLM editor, notifications — see git history and product roadmaps.
