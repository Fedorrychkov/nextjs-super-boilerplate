# Changelog

## [Unreleased]

### Deploy and backups (batch 8)

- **Blue/green swap without a 502 window** (`scripts/lib/blue-green.sh`): the validated green container takes the network alias `api-service`, so nginx balances to blue and green; blue is retired, the new blue starts under its own name, green is removed. nginx is reloaded after each step, never restarted; app locations get `proxy_connect_timeout 3s`, so a request to a vanished container address moves on instead of hanging for 60 s. On a stand under 25 req/s the old order lost 9 requests with a 2-second app start, the new one 0 of ~590 in two runs. nginx is recreated only when a release changes its template or compose config
- **certbot without the Docker socket** — it drops a file into the shared `nginx_signals` volume (`request-nginx-reload.sh`, also the `--deploy-hook`); nginx checks it every 30 s and reloads gracefully. The nightly nginx restart before the certificate check is gone; `docker-cli` removed from the certbot images
- **Container logs `100m × 3`** instead of `2g × 3` — inputs `docker_log_max_size` / `docker_log_max_file`. Redis and mongo keep theirs: changing it would restart the database
- **Off-site copy of each Mongo dump (optional)** — `mongo_backup_remote: s3://bucket/prefix` (any S3-compatible storage, `mongo_backup_s3_endpoint` / `_region`) or `sftp://user@host:port/path`, keys in workflow secrets. The deploy writes them into `~/db-backups/.remote.env` (0600); the backup script uploads with a throwaway rclone container (image pinned by digest, keys via `--env-file`, never argv), keeps N days remotely (`mongo_backup_remote_retention_days`), and exits 1 with `ERROR` when the upload fails — the local dump is kept. SFTP host key pinned via `mongo_backup_sftp_known_hosts`
- **`build_node_options`** — `NODE_OPTIONS` for `next build` only (e.g. a bigger heap); empty by default
- **First deploy with this release** recreates nginx once (new command and volume — about a second) and certbot (now without the socket)

### Admin, theme tokens and UX (batch 7)

- **Admin overview at `/admin`** (ADMIN; editors are sent to articles): what needs attention first — database or Redis down, scheduled articles with no live worker, a worker that stopped reporting, overdue publications, metrics switched off — then health tiles and people/article counts. A failing dependency is shown, not thrown
- **Grouped admin menu** — Admin, Content, Analytics, Security; a group with nothing the role may open is hidden. Section toggles are chevrons instead of a "×" that read as "close"
- **Theme tokens in one source** — `config/design-tokens.json` → `src/app/tokens.css` (`pnpm tokens`), new gate `check-design-tokens`. The palette moved as is: computed values of every variable in both themes matched before and after
- **New UI pieces**: `PageShell`, `EmptyState`, `Switch` (boolean platform settings use it)
- **Find a person** — `/admin/users` search box: part of the email (case-insensitive) or an exact id; `q` in `GET /api/v1/user/list`, escaped and capped at 100 characters
- **Translations screen** renders cards 100 at a time with "Show more" instead of ~1700 textareas at once
- Field labels capitalize the first letter only (`capitalize` turned every word upper-case)

### Metrics facade (batch 6)

- **One facade for product events and errors** (`lib/metrics`): `metrics.track` / `metrics.error`, a closed event list (`METRIC_EVENTS`) whose properties are enum values only. The sink is a platform setting: `log` (default), `mongo` (collection with TTL from `metrics.retentionDays`, summary at `/admin/metrics`), `posthog` (batch API, no IP or geo, no person profile for anonymous browsers, errors as `$exception`), `custom` (`registerMetricsSink`), `off`. A failing sink is logged and never breaks the action
- **Events wired**: login (password, MFA, OAuth), sign-up, article published (manual and scheduled); page views from the browser after analytics consent
- **Error tracking**: unexpected 500s from API handlers, final job failures in the worker, browser errors (`window.onerror`, `unhandledrejection`) and the new `src/app/error.tsx` / `global-error.tsx` (retry button, error digest). Messages scrubbed of emails, JWTs, ids, queries and tokens; the same error at most once per 5 minutes
- **Pseudonymous ids**: a signed-in user is `u_<hmac>` keyed by the server secret, never the account id; an anonymous browser is `a_<uuid>`
- **Browser ingestion** `POST /api/v1/ev/batch`: 32 KB, 50 events, its own 60/min limit, replayed events deduplicated by uuid
- **Malformed ids answer 400, not 500** — a mongoose `CastError` from a bad id in the URL was reported as a server fault (found by the new error tracking on three routes)

### Platform settings (batch 5)

- **Runtime settings in the admin** — `/admin/platform-settings` (ADMIN): switches, limits and integration keys changed without a release. Registry in code (`config/platform-settings.ts`: key, group, spec, default, `sensitive`, `secret`), values in Mongo (`PlatformSetting`: who, when, previous value), 60 s Redis cache dropped on write, a stored value that no longer passes its spec falls back to the default. The admin editor is chosen by the spec (`boolean`, `int`, `choice`, `text`, `textList`) — a new setting needs no UI code. Every change goes to the security audit log (`platform_setting_updated`, secrets only as set / not set); sensitive settings ask for confirmation
- **Secrets encrypted** with AES-256-GCM under a subkey derived by HKDF from `MFA_ENCRYPTION_KEY` (`lib/security/keys.ts`) — no new env variable; never returned to the admin, sealed in the cache too
- First settings: the metrics sink (`metrics.*`), used by the next batch
- Rule in `AGENTS.md`: a new runtime switch is a platform setting, not a new env variable
- Security audit labels for the eight actions that had none (`api_token_policy_updated`, `mcp_oauth_*`, `machine_access_*`)

### Worker as a platform (batch 4)

- **Queues** — `lib/queues/queue.ts`: `defineQueue` (definition shared by API and worker), `enqueue` (idempotent `jobId`, `'unavailable'` without Redis), `consume` (worker only), `closeQueues` on SIGTERM; completed jobs kept an hour, failed a week. New gate `check-worker-wired`: every defined queue must be consumed in a module the worker imports
- **Notifications are delivered by the worker when it is alive** — a fresh liveness mark decides; otherwise they are delivered inline as before, so a deployment with Redis but no worker (the default) loses nothing. Delivery takes a lease on the record (`deliveringAt`), so a retried job and the `notifications-requeue` sweep (every 2 min, pending older than 2 min and younger than a day) never send twice. Checked on a stand: inline without a worker, queued and delivered with one, a stuck record re-delivered by the sweep
- **"The worker is alive"** — job `worker-beat` writes `WorkerHeartbeat` every minute; `/api/v1/healthcheck` reports `worker: ok | stale | never | unknown` and never changes its status because of it. The article editor warns when scheduled publishing has no live worker
- **Retention job** — per-channel delivery logs older than 90 days are dropped (`deliveryHistoryClearedAt`); notifications themselves stay
- `pnpm doctor` no longer says a worker without `WORKER_HEARTBEAT` idles — it always has jobs now

### Scheduled article publishing (batch 3)

- **Articles can be scheduled** — the editor's publication block takes a date and time (browser time zone, sent as UTC), the list shows "goes live …", MCP gets `schedule_article`. The worker job `articles-scheduled` publishes due articles once a minute: confirms the revision, publishes, pings IndexNow, notifies whoever scheduled — in their language. Needs the background worker (`worker_enabled`); the editor says so
- **Claimed atomically** by the article's old status, time, revision and `updatedAt`: two workers, a manual publish or an edit in the same minute never publish twice (checked: two parallel passes over three due articles publish each exactly once). A revision of another article is skipped; a revision confirmed for a claim that missed goes back to its old status
- **Rules** (`lib/services/article-schedule-decision.ts`, tested): a time needs a time zone and must not be in the past; a published article cannot be scheduled and publishing by hand drops the schedule; taking an article down drops it too; setting or dropping a time needs `articles:publish`; the server writes `scheduledBy`, never the client
- **Public article page caches only hits** — a miss is remembered for a minute in the shared cache (Redis), and every invalidation goes through one helper, `invalidatePublicArticlePage`, which drops both. The worker cannot call `revalidateTag`; without this a scheduled article stayed a 404 until the next edit. Unknown slugs no longer hit the database on every request either

### Hygiene (backport from a descendant, batch 2)

- **Worker scheduler on BullMQ Job Schedulers** — `getRepeatableJobs` / `repeat` are deprecated in BullMQ 5 and gone in 6, and a repeatable job keyed by (name + every) kept ticking after an interval change. Schedules written by the old code are removed on boot so they do not tick next to the new ones (checked against a real Redis: one schedule, one tick per interval)
- **Every third-party action pinned to a commit SHA** (with the release tag in a comment), gitleaks pinned by digest (`v8.30.1@sha256:…`); majors unchanged. New gate `check-actions-pinned`
- **Docs gate checks anchors** — `file.md#section` and `#section` must point at a real heading (GitHub slug rules, numbered duplicates, `<a id>`). It found one broken link, fixed; the FAQ entry on nginx 413 now describes the per-location limits
- **`/indexnow.txt`** — every IndexNow ping sent `keyLocation=<site>/indexnow.txt`, which returned 404, so search engines could not verify the key
- **Article dates in meta and JSON-LD are always ISO** — uncached rendering put `Date` objects into `article:published_time` ("[object Object]"); `og:locale:alternate` on an article lists only languages it is really translated into
- Elastic Email requests time out after 20 s instead of never; the empty toast container no longer swallows clicks in the bottom-left corner; personal notifications no longer show delivery status, type and source (admin log still does); a failed refresh reloads the page at most once a minute per tab (no reload loop for guests)

### Security and tokens (backport from a descendant, batch 1)

- **A refresh token is no longer accepted as a Bearer** — both token kinds were signed with the same secret and carried the same claims, so the refresh token (days) passed `verifyAccessToken`. Tokens now carry `typ`; a token without it, issued before this change, is classified by its lifetime (`lib/jwt/token-type.ts`, tested), so nobody is signed out on deploy: legacy access tokens live out their hour, legacy refresh tokens still refresh but no longer authorize API calls
- **Refresh tokens are stored hashed** — the `token` field now holds `h:<sha256>`; lookup accepts both forms during the transition, rows are rewritten on rotation and by a background pass at server start. Same field and index, no schema migration
- **Refresh lifetime is one number** — token, database row and cookie all use min(`JWT_REFRESH_EXPIRES_IN`, 7 days). The cookie always lived 7 days, so idle sessions end as before; a leaked token or database row no longer stays valid for the 182 days of the old template value. Template default is now `604800`; the doctor warns above the cap
- **API authorizes by role and status from the database** — the JWT said what was true at sign-in, so a demoted or blocked user kept access for up to an hour. One snapshot (session alive + role + status + email) is read per request and cached 30 s in Redis, dropped at once on role/status change, sign-out and session revocation (generation counter). Without Redis it is not cached, so revocation stays immediate. Replaces the per-request `RefreshToken.exists` with a cached check
- **The TOTP secret no longer goes to `api.qrserver.com`** — the MFA setup QR code is drawn in the browser (`QrCode`, `qrcode-generator`, loaded lazily)
- **Axios logs method and path only** — the request interceptor logged all headers at info, which on the server includes the forwarded `Cookie` with both tokens
- **Security audit filter covers every action** — the filter list missed the `mcp_oauth_*` and `machine_access_*` actions the code writes; the type is now derived from the one list (`SECURITY_AUDIT_ACTIONS`)
- **CSP built in `config/csp.ts`** — the enforced policy no longer allows the Yandex Metrika / Google Analytics / GTM / yclients hosts no code loads, and `upgrade-insecure-requests` is production-only (Safari applied it to localhost). A strict candidate without `unsafe-eval` and bare `https:` in `connect-src` runs as `Content-Security-Policy-Report-Only`; violations go to `POST /api/v1/csp-report` and are logged as directive + origin only. Forks that load third-party scripts add their hosts to `THIRD_PARTY` in the same file
- **Public env allow-list** — `config/public-env.json` lists what the build may bake into the client; the deploy passes only those names to `docker build`, and the new `check-public-env` gate keeps the list in sync with the code and `.env.example`
- `next dev` no longer appends its own block to `AGENTS.md` (`agentRules: false`); ESLint ignores `.claude/worktrees/**`; gate unit tests (`check-*.test.mjs`) are not run as gates

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
