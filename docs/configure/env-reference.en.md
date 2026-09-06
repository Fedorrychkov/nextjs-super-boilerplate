# Environment variables reference

Русская версия: [env-reference.ru.md](./env-reference.ru.md)

Source of truth: [`.env.example`](../../.env.example) (template) and [`config/env.ts`](../../config/env.ts)
(parsing and defaults). Sections and order match the template; `pnpm gates` (`check-env-reference`)
keeps the two in sync by name. Values are validated by `pnpm doctor`.

Legend: **R** — required in prod, **C** — conditional (when the feature is on), **O** — optional.
"Default" is what the code substitutes when the variable is empty.

## App & site

| Variable | Default | Notes |
|---|---|---|
| `APP_ENV` | development | `development` \| `stage` \| `production` |
| `NEXT_PUBLIC_APP_ENV` | development | Client-side environment label |
| `NEXT_PUBLIC_SITE_URL` | http://localhost:3000 | **R** — canonical URL for metadata, sitemap, OAuth redirects |
| `APP_INTERNAL_ORIGIN` | http://127.0.0.1:3000 | O — server-side requests to the app's own API when the public hostname does not resolve from inside the container |
| `COMMIT_HASH` | — | Injected by CI; server-only, correlates RUM and deploys |

## Theme & i18n

| Variable | Default | Notes |
|---|---|---|
| `DEFAULT_THEME_MODE` | dark | SSR fallback when the OS preference is unknown: `dark` \| `light` |
| `NEXT_PUBLIC_DEFAULT_THEME_MODE` | dark | Client mirror |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | en | `en` \| `ru` |
| `NEXT_PUBLIC_ORGANIZATION_SAME_AS` | — | O — JSON-LD `sameAs`, comma-separated links |

## Auth & JWT

| Variable | Default | Notes |
|---|---|---|
| `JWT_SECRET` | placeholder | **R** — signs access/refresh tokens; `make setup` generates it |
| `JWT_ACCESS_EXPIRES_IN` | 3600 | Seconds |
| `JWT_REFRESH_EXPIRES_IN` | 15724800 | ~21 days; refresh session TTL |
| `MFA_ENCRYPTION_KEY` | — | **R** when TOTP is used. Regenerating invalidates every enrolled MFA |
| `FIRST_ADMIN_LOGIN` | — | O — the first admin is created on start if the user does not exist |
| `FIRST_ADMIN_PASSWORD` | — | O |

## MongoDB

| Variable | Default | Notes |
|---|---|---|
| `MONGO_URI` | — | **R** or the fields below. External cluster — full connection string. Local container (`mongo_enabled: true`) — better left empty: the string is assembled from the fields with `authSource=admin` |
| `MONGO_HOST` | localhost | Compose service name `mongo` on the server; `localhost` only when the app runs on the host. Inside the api container `localhost` is the api itself |
| `MONGO_PORT` | 27017 | |
| `MONGO_USER` | — | The container is **always** created with a root user (compose defaults `admin`/`password`) — set your own |
| `MONGO_PASSWORD` | — | |
| `MONGO_DB` | app | |

With `MONGO_ENABLED=true` (a deploy input) `pnpm doctor` catches four mistakes: loopback host, URI
without credentials, credentials without `authSource`, empty `MONGO_USER`/`MONGO_PASSWORD` —
`config/container-topology.ts`.

## Redis & rate limit

| Variable | Default | Notes |
|---|---|---|
| `REDIS_URL` | — | **C** — rate limit, LLM limit, BullMQ worker. On a server with `redis_enabled: true` use `redis://redis:6379`, not localhost (doctor with `REDIS_ENABLED=true` rejects loopback). Without Redis the limiter degrades to process memory |
| `RATE_LIMIT_POINTS` | 400 | Requests per window per client |

## Background worker

A separate headless container with cron jobs — [`../deploy/background-worker.ru.md`](../deploy/background-worker.ru.md) (RU).
The container itself is enabled by the deploy input `worker_enabled`; the variables below gate jobs inside it.

| Variable | Default | Notes |
|---|---|---|
| `WORKER_HEARTBEAT` | false | Example job (liveness log); replace with your own in `scripts/worker.ts` |
| `WORKER_HEARTBEAT_INTERVAL_MS` | 300000 | |

## Registration & email

| Variable | Default | Notes |
|---|---|---|
| `REGISTRATION_MODE` | — | `email` — OTP to the mailbox; empty — sign-up without verification |
| `REGISTRATION_CODE_PEPPER` | JWT_SECRET | HMAC pepper for codes |
| `EMAIL_SEND_MODE` | empty | `console` (log only) \| `elastic` (Elastic Email API) \| `empty` (do not send) |
| `EMAIL_API_KEY` | — | **C** elastic |
| `EMAIL_FROM` | Noreply \<noreply@localhost\> | **C** elastic — verified sender |
| `EMAIL_REPLY_TO` | — | O |
| `EMAIL_TEMPLATE_VERIFY_EMAIL_EN` | — | O — Elastic template name, merge field `code` |
| `EMAIL_TEMPLATE_VERIFY_EMAIL_RU` | — | O |
| `EMAIL_TEMPLATE_PASSWORD_CHANGE_EN` | — | O — empty → plain text from i18n |
| `EMAIL_TEMPLATE_PASSWORD_CHANGE_RU` | — | O |
| `EMAIL_TEMPLATE_PASSWORD_FORGOT_EN` | — | O |
| `EMAIL_TEMPLATE_PASSWORD_FORGOT_RU` | — | O |

## Account security & onboarding

`ACCOUNT_CONFIG` flags; behaviour — [`feature-flags.ru.md`](./feature-flags.ru.md) (RU).

| Variable | Default | Notes |
|---|---|---|
| `AUTH_PASSWORD_CHANGE_ENABLED` | 0 | Password change in the profile |
| `AUTH_PASSWORD_FORGOT_ENABLED` | 0 | Forgot-password flow |
| `AUTH_RECOVERY_STRICTNESS` | strict | `strict` \| `flexible` |
| `AUTH_ADMIN_ACCOUNT_RECOVERY_ENABLED` | 0 | Admin MFA/password reset |
| `AUTH_SESSIONS_ENABLED` | 0 | Active sessions UI and API; access token bound to `sid` |
| `ONBOARDING_VERSION` | 0 | Bump to show onboarding again |
| `ONBOARDING_ENABLED` | 0 | Onboarding API |
| `ONBOARDING_PUSH_PROMPT_ENABLED` | 0 | Push subscription step |
| `NEXT_PUBLIC_ONBOARDING_ENABLED` | 0 | Onboarding UI |
| `NEXT_PUBLIC_ONBOARDING_PUSH_PROMPT_ENABLED` | 0 | |
| `NEXT_PUBLIC_PUSH_IOS_PWA_HINT_ENABLED` | 0 | iOS PWA hint |

## OAuth / social login

Design — [`oauth.ru.md`](./oauth.ru.md) (RU). A provider is enabled by **three** things together: its
name in the lists, `AUTH_OAUTH_<X>_ENABLED=1`, client id/secret. Any omission is silence — no
button, no error; `pnpm doctor` is the only thing that says so.

| Variable | Default | Notes |
|---|---|---|
| `AUTH_UI_MODE` | credentials_first | `credentials_first` \| `oauth_first` \| `credentials_only` \| `oauth_only` |
| `NEXT_PUBLIC_AUTH_UI_MODE` | — | Client mirror |
| `AUTH_OAUTH_SIGN_IN_PROVIDERS` | — | Comma-separated: yandex, google, github, vk, discord |
| `AUTH_OAUTH_SIGN_UP_PROVIDERS` | — | |
| `AUTH_OAUTH_LINK_PROVIDERS` | — | Link/unlink in the profile |
| `NEXT_PUBLIC_AUTH_OAUTH_SIGN_IN_PROVIDERS` | — | Public lists for the UI |
| `NEXT_PUBLIC_AUTH_OAUTH_SIGN_UP_PROVIDERS` | — | |
| `NEXT_PUBLIC_AUTH_OAUTH_LINK_PROVIDERS` | — | |
| `AUTH_OAUTH_YANDEX_ENABLED` | 0 | |
| `YANDEX_OAUTH_CLIENT_ID` | — | **C** |
| `YANDEX_OAUTH_CLIENT_SECRET` | — | **C** — server only |
| `AUTH_OAUTH_GOOGLE_ENABLED` | 0 | |
| `GOOGLE_OAUTH_CLIENT_ID` | — | **C** |
| `GOOGLE_OAUTH_CLIENT_SECRET` | — | **C** |
| `AUTH_OAUTH_GITHUB_ENABLED` | 0 | |
| `GITHUB_OAUTH_CLIENT_ID` | — | **C** |
| `GITHUB_OAUTH_CLIENT_SECRET` | — | **C** |
| `AUTH_OAUTH_VK_ENABLED` | 0 | |
| `VK_OAUTH_CLIENT_ID` | — | **C** |
| `VK_OAUTH_CLIENT_SECRET` | — | **C** |
| `AUTH_OAUTH_DISCORD_ENABLED` | 0 | |
| `DISCORD_OAUTH_CLIENT_ID` | — | **C** |
| `DISCORD_OAUTH_CLIENT_SECRET` | — | **C** |

## Web push (VAPID)

| Variable | Default | Notes |
|---|---|---|
| `VAPID_SUBJECT` | — | **C** — `mailto:` or an https URL |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | — | **C** — `make setup` generates the pair |
| `VAPID_PRIVATE_KEY` | — | **C** |

## Notifications

`NOTIFICATION_CONFIG`. Channels: `all` or a list of `web_push`, `email`.

| Variable | Default | Notes |
|---|---|---|
| `NOTIFY_ARTICLE_ENABLED` | 0 | Article published |
| `NOTIFY_ARTICLE_CHANNELS` | all | |
| `NOTIFY_MFA_ENABLED` | 0 | MFA enabled/disabled |
| `NOTIFY_MFA_CHANNELS` | all | |
| `NOTIFY_LOGIN_ENABLED` | 0 | Sign-in from a new device |
| `NOTIFY_LOGIN_CHANNELS` | email | |
| `NOTIFY_PASSWORD_ENABLED` | 0 | Password changed/reset |
| `NOTIFY_PASSWORD_CHANNELS` | email | |

## LLM

| Variable | Default | Notes |
|---|---|---|
| `NEXT_PUBLIC_LLM_ENABLED` | false | Chat and suggestions in the article editor |
| `LLM_API_KEY` | — | **C** when LLM is on; server only |
| `LLM_CHAT_MODELS` | gpt-4o-mini,gpt-4o | O — chat model allowlist |
| `LLM_IMAGE_MODELS` | gpt-image-1-mini,gpt-image-1.5 | O — image generation allowlist |
| `LLM_CHAT_RATE_LIMIT_POINTS` | 30 | Requests per user per window |
| `LLM_CHAT_RATE_DURATION_SEC` | 60 | |
| `PROXY_ACCESSES` | — | O — JSON array of `"host:port:user:password[:geo]"`; one entry is picked per request |

## SEO & indexing

| Variable | Default | Notes |
|---|---|---|
| `INDEXNOW_API_KEY` | — | O — IndexNow key (Bing, Yandex). Public by protocol: served as `/<key>.txt`, may live in deploy Variables |
| `INDEXNOW_KEY_LOCATION` | — | O |
| `GOOGLE_INDEXING_CLIENT_EMAIL` | — | O — Google Indexing API (JobPosting/BroadcastEvent only) |
| `GOOGLE_INDEXING_PRIVATE_KEY` | — | O — private key on one line, `\n` → `\\n` |
| `SEO_NOTIFY_AUTH_ENABLED` | false | Guards `/api/v1/seo/*` with the `x-seo-notify-secret` header. Enabled + empty secret → 503 |
| `SEO_NOTIFY_SECRET` | — | **C** when the guard is on; `make setup` generates it |

## RUM

| Variable | Default | Notes |
|---|---|---|
| `RUM_ENABLED` | true | Server-side Web Vitals ingest (`/api/v1/rum`) |
| `NEXT_PUBLIC_RUM_ENABLED` | true | Client-side reporting |
| `NEXT_PUBLIC_RUM_SAMPLE_RATE` | 0.2 | Fraction of page loads that report all vitals (0–1) |
| `NEXT_PUBLIC_SKIP_ANALYTICS_CONSENT` | false | Dev only: no consent banner |

## CDN (Uploadcare)

| Variable | Default | Notes |
|---|---|---|
| `UPLOADCARE_PUBLIC_KEY` | — | O — media uploads |
| `UPLOADCARE_SECRET_KEY` | — | O |

## Machine access: API tokens + MCP

`API_TOKENS_CONFIG`. Design — [`../../mcp/README.md`](../../mcp/README.md) and
[`../develop/mcp-server.ru.md`](../develop/mcp-server.ru.md) (RU).

| Variable | Default | Notes |
|---|---|---|
| `API_TOKENS_ENABLED` | 0 | PAT auth, `/api/v1/api-token/*`, remote MCP `/api/mcp`, the `/admin/api-tokens` and `/profile/api-tokens` pages |
| `NEXT_PUBLIC_API_TOKENS_ENABLED` | 0 | Navigation items |
| `MCP_SERVER_NAME` | nsb-mcp | Name the MCP server reports to hosts |
| `NEXT_PUBLIC_API_TOKEN_BRAND` | nsb | Prefixes `<brand>_pat_`, `<brand>_oat_`, `<brand>_mcp_client_`. Set once at project start |
| `MCP_OAUTH_ENABLED` | 0 | OAuth 2.1 over `/api/mcp` for Claude connectors; requires `API_TOKENS_ENABLED=1` — [`../develop/mcp-oauth-design.ru.md`](../develop/mcp-oauth-design.ru.md) |
| `MCP_OAUTH_ACCESS_TTL_MINUTES` | 60 | Short-lived access token, refresh via `refresh_token` |
| `MCP_OAUTH_CLIENT_RETENTION_DAYS` | 30 | Lazy cleanup of DCR clients with no grants and no activity |
| `API_TOKEN_USAGE_RETENTION_DAYS` | 30 | TTL of the usage series (`/admin/machine-access`). Changing it on a live database means dropping the TTL index |

MCP host variables (not the app): `NSB_API_BASE_URL`, `NSB_API_TOKEN`.

<!-- env-gate: ignore -->
## Not in `.env`: deploy inputs and compose

Come from `prod-deploy.yml` → `reusable-deploy-config.yml`, not from the env file.

| Name | Source | Effect |
|---|---|---|
| `MONGO_ENABLED`, `REDIS_ENABLED` | inputs `mongo_enabled` / `redis_enabled` | The pre-deploy doctor checks sibling-container topology |
| `WORKER_ENABLED` | input `worker_enabled` | Starts the worker container |
| `SERVER_MEMORY_MB`, `*_MEM_LIMIT`, `WORKER_NODE_OPTIONS` | memory budget inputs | `scripts/lib/memory-limits.sh` |
| `env_public` | repository Variables | Public part of the environment, appended after the secret — [`../deploy/ci-notifications-lighthouse.ru.md`](../deploy/ci-notifications-lighthouse.ru.md) (RU) |
<!-- /env-gate -->

## Not in `.env`: `config/product.ts`

| Field | Purpose |
|---|---|
| `name`, `shortName`, `description` | Metadata, manifest |
| `author` | JSON-LD and article byline (`null` — hide) |
| `links.github`, `links.demo` | Homepage, schema |
| `schema.*` | Person / SoftwareApplication |
| `pwa` | Manifest colours and icons |
| `sitemapExtras` | Extra sitemap URLs |
