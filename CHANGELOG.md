# Changelog

## [Unreleased]

### UI (backport batch G)

- **Cabinet is one route group** — `src/app/(cabinet)/layout.tsx` replaces four identical `layout.tsx` files (`admin`, `notifications`, `profile`, `ui-kit`); URLs are unchanged. Moving between sections no longer unmounts and remounts the sidebar (open sections, scroll position and navigation queries survive)
- **Sidebar wrappers use `overflow-clip` and `min-w-0`** — `overflow-hidden` made the cabinet a scroll container, so any `sticky` inside never stuck; without `min-w-0` the main column could not shrink below its content and ran off-screen by the sidebar's width
- **Security notifications and OAuth return open the right profile tab** — new login → `/profile?activeTab=devices`; MFA on/off, password changed/reset/set by admin → `/profile?activeTab=security`; OAuth link/unlink return and the OAuth error page → `/profile?activeTab=security#connected-accounts` (tabs are lazy, so the bare anchor had no target). The service worker navigates an already-open `/profile` window to the notification URL instead of only focusing it

### Media (backport batch D)

- **Upload size is checked on `Content-Length` before the body is read** — `formData()` buffered the whole request first, so the 200 MB check in the handler protected nothing. A missing or non-numeric header keeps the old path (`src/lib/security/uploadContentLength.ts`, tested)
- **nginx: `client_max_body_size` 10m by default, 200m only on `location = /api/v1/media/upload`** — the limit used to be 200m for every request, including anonymous API calls. Nested location in all three templates, verified with `nginx -t` and a live proxy test (`set` variables are repeated: the rewrite module does not inherit them)
- **File type from the bytes, not from the form** — `sniffFileMime` (JPEG, PNG, GIF, WebP, HEIC/AVIF, PDF, SVG, HTML) and `decideUploadMime`: an image slot takes image bytes only, no slot takes HTML, SVG stays allowed for images (served from the CDN origin, never ours). The storage's own detection must agree with the sniffed type or the file is deleted and the request answers `MEDIA_MIME_MISMATCH` (`src/lib/security/fileSignature.ts`, tested). Unknown `resourceType` values are ignored instead of stored
- **`MediaAsset.purpose` (`cms` \| `user`) and `visibility` (`public` \| `private`)** — defaults match every existing document, no migration. `/cdn/<id>` answers 404 for a private asset (for everyone, including the owner) and for a malformed id instead of a CastError 500
- **`GET /api/v1/media/[id]/file`** — authorised counterpart of `/cdn` for private assets: owner or admin (`canReadMediaAsset`, tested), streamed through our origin with `Cache-Control: private, no-store`, `nosniff`, a sandbox CSP and `Content-Disposition: attachment` for anything that is not a raster image
- **Media API responses are an explicit DTO** — no `createdBy`, `originalUrl` or `providerFileId` (`toMediaAssetDto`); the library lists CMS files only (`purpose != user`), and the library delete answers 404 for a person's file
- `pnpm doctor` unchanged; `.env.example` unchanged

### Deploy pipeline (backport batch E)

- **Smoke check after deploy** — the runner requests `/api/v1/healthcheck` and `/` on the domain after nginx restarts (12 attempts); a non-200 answer fails the run and fires the failure notification. Nothing is rolled back. Off with `smoke_check_enabled: false` for domains not reachable from GitHub runners
- **Actions pinned to commit SHAs** — `appleboy/ssh-action` (v1.2.5), `appleboy/scp-action` (v1.0.0), `actions/checkout` (v6.1.0) instead of `@master` / `@v2`
- **Minimum permissions** — `prod-deploy.yml` runs with `contents: read` + `packages: write` instead of `write-all`; `id-token` dropped from the reusable workflow; `GITHUB_TOKEN` / `GH_USERNAME` no longer sent to the server; the server runs `docker logout ghcr.io` when the deploy script ends
- **No `find ~ -name '*.tar.gz' -exec rm` on the server** — replaced by `rm: true` on the scp step (fresh `~/app_new` every deploy)
- **`paths-ignore` on push to `main`** — documentation, `*.md`, `patch/`, `skills/`, `.claude/`, `lighthouserc.json` and CI-only workflows no longer restart production
- **Dockerfile test step removed** — it ran zero tests (`.dockerignore` excludes `**/*.test.*`); the `quality` workflow now fails if fewer than 100 tests ran, so an empty glob cannot report green
- **`migrations_run: true` without migration scripts fails the deploy** instead of "No pending migrations"

### Mail (backport batch C)

- **`EMAIL_SEND_MODE` has exactly three modes** — `console` (log; a dev/stage workflow, codes are read from the log), `elastic` (the only delivering transport) and `empty` (mail off). Anything else used to fall through to the console provider and report "skipped" as if that were fine; now it is `email_mode_unknown`, logged as an error, and `pnpm doctor` warns (`lib/services/email/email-mode.ts`, tested)
- **Sign-up and password-recovery codes check the send result** — `console` is accepted, `empty` / a typo / a refused send answer `SIGNUP_EMAIL_FAILED` / `PASSWORD_EMAIL_FAILED` instead of "code sent" with no mail on the way; the recovery send counter is not incremented on failure
- **Recovery email factor** counts `console` as available (unchanged), `elastic` needs a key, `empty` and unknown are off (a typo used to count as available)
- **Notification events with an email-only channel are recorded even when mail is off** — the channel is no longer filtered out before delivery; delivery marks it `skipped: email not configured`, so a login or password event is not lost without a trace. Aggregate status: all channels skipped → `skipped`, not `delivered`
- `pnpm doctor` — warnings (never new errors): unknown `EMAIL_SEND_MODE`, `REGISTRATION_MODE=email` with `console` in production, password recovery or notification email channel without a delivering transport

### Auth and leaks (backport batch B)

- **Access token no longer echoed in response headers** — `src/proxy.ts` used to copy the httpOnly `accessToken` cookie into the `Authorization` header of every page response (readable by any script from its own `fetch`, so one XSS took the whole session), along with `X-Client-Info`, `X-Client-IP`, `X-Real-IP`, `X-Forwarded-For`, `X-User-Agent`. Removed; nobody consumed them. The proxy now has a `matcher` and no longer runs on `/api/*` and static assets
- **API request logs without headers** — `apiErrorHandlerContainer` logged every request header (`cookie` with both tokens, `authorization`, `x-api-token`) and the full URL with query at `info`. Now `debug`, path only, request id and content length
- **First-admin oracle closed** — public sign-up answered 403 for a wrong `FIRST_ADMIN_PASSWORD` and 400 for the right one. The bootstrap branch lives only while the database has no ADMIN, uses a constant-time compare, counts wrong attempts against the login brute-force limits, and a mismatch takes the ordinary path (`src/lib/auth/firstAdmin.ts`, tested)
- **Open redirects via `nextPath`** — one validator `safeInternalPath` (`src/lib/security/safeInternalPath.ts`, tested against `//host`, `/\host`, encoded and absolute forms) on `/login`, `/refresh`, `/logout`, the page guard and all five OAuth spots; `nextPath` is re-encoded when glued into a URL (`withNextPath`)
- **`/login` no longer logs you out** — the page fired `POST /auth/logout` on mount (logout-CSRF via any external link, and the header "Sign in" button threw out whoever was signed in). A signed-in visitor is redirected on; signing out is only `/logout`
- **Forgot-password no longer reveals registration** — an unknown address gets the same shape a typical user gets (decoy `pendingId`, never stored); TOTP verification in the recovery flow is rate-limited per pending session
- **MFA login challenge is single-use with an attempt counter** — `takeLoginChallenge` (atomic `GETDEL`, `CacheClient.take`), five wrong codes kill the challenge, failures feed the login brute-force counters (`lib/security/login-challenge-policy.ts`, tested)
- **Legacy `POST /api/v1/auth/register`** — ADMIN only (EDITOR could create users), the password policy applies, and the response no longer swaps the caller's cookies for the new user's; `register-by-admin` is the supported path
- **Healthcheck pings Mongo** — `/api/v1/healthcheck` reports `db: ok|fail` in the body and logs a failed ping. Status stays 200 by default; `HEALTHCHECK_DB_STRICT=true` makes it 503 (container unhealthy, no blue/green swap) for deployments that want that
- **Service worker keeps no private HTML** — `/profile`, `/admin`, `/notifications` are never written to Cache Storage (deny-list in `sw.js` + `Cache-Control: no-store` headers in `next.config.ts` + `Cache-Control` check before `cache.put`); HTML cache bumped to `html-v4` so copies saved by v3 are dropped
- `robots.ts` — every named bot group carries the same `disallow` (per RFC 9309 a crawler reads one group and ignores `*`; private sections were open to Yandex, Bing and LLM crawlers)
- `src/instrumentation.ts` — a production process refuses to start with an empty or default `JWT_SECRET` (the doctor already errors on that before deploy); a secret shorter than 32 characters is a warning in both, never a stop (`src/lib/security/jwtSecret.ts`, tested)
- OAuth browser errors log the path, not the full URL with `code` / `state`

### Agent gate and quality gates (backport batch A)

A downstream audit produced 94 findings against this boilerplate (plan and batches: [`docs/plans/backport-hardening.ru.md`](docs/plans/backport-hardening.ru.md)). Batch A — nothing that changes runtime behaviour:

- **`scripts/guard-external.sh`** — bare `git push` (no explicit remote + branch), `--all` / `--mirror` / `HEAD` / `refs/heads/main`, `gh pr merge`, `gh api` writes, `gh workflow run` / `release` / `secret` / `variable` / `repo`, `docker volume rm` / `prune`, `compose down -v`, `system prune`, `crontab -r`, backup deletion and `dropDatabase(` are denied; quoted wrappers (`ssh host '…'`, `bash -c`, `eval`) are unwrapped. Verdict table with 100+ commands in `scripts/guard-external.test.mjs` (runs in `pnpm test`)
- **Fail-closed honestly** — the hook in `.claude/settings.json` is a `[ -x ]` wrapper (a missing or non-executable script used to mean "allow": PreToolUse treats 126/127 as "do not block"); new gate `check-agent-gate` watches the executable bit and the wrapper. `permissions.deny` extended, `gh release` removed from `allow`
- `check-agent-contract` — the `AGENTS_RU.md` twin is optional, but a twin drifting more than 25 % in size fails; paths resolved from the repo root
- `scripts/lib/ratchet.mjs` — a missing baseline fails instead of silently writing one (in CI the write is lost and the ratchet compares nothing)
- pre-commit — `typecheck` + `lint-staged` (`eslint --fix --max-warnings 0` on staged files only); the repo-wide `lint:fix` pass that edited files outside the commit is gone
- `docs/plans/` — names `<domain>-<what>.ru.md`, own index in `docs/plans/README.md`; `check-docs-structure` reads it
- eslint `no-restricted-syntax` (raw inputs / text tags) is `error` (0 violations); agent docs no longer name non-existent wrappers or old doc paths
- **Deploy over SSH key** (opt-in) — `server_ssh_key` + `server_ssh_fingerprint` secrets next to the password in every ssh/scp step; the key wins when set, the password stays as the fallback, and a preflight step stops the run before touching the server when neither is present. Callers pass `PROD_WEB_SSH_KEY` / `PROD_WEB_SSH_FINGERPRINT`; nothing changes until they exist

Audit of the boilerplate against what is already proven in production use — see [`docs/audits/2026-09-boilerplate-vs-children.ru.md`](docs/audits/2026-09-boilerplate-vs-children.ru.md). Ported back:

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

### Fixes

- **Landing** — the header / hero / footer "live demo" link is hidden when `links.demo` is the site itself (it opened the homepage in a new tab on the demo); the version badge now reads `package.json` instead of a hard-coded `v0.2`
- **Agent guard** — `guard-external.sh` no longer blocks every `git push`: the agent pushes its branch and opens the PR into `develop` itself; only pushes into `main` and force-pushes are denied (decision journal §10)

- **Page weight** — `public/images/favicon.svg` was a 1024px PNG wrapped in `<svg>` (680 KB transferred on every page, more than all the JS); removed from the icon list and from the repo, the `.ico` / 96px PNG / apple-touch icons remain. `/notify.mp3` no longer preloads on every page (`preload="none"`, fetched on the first play). Found by the new Lighthouse budget on its first run: pages went from ~1.26 MB to ~0.5 MB

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
