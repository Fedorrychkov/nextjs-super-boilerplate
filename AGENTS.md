# AGENTS.md — project context for AI agents

Russian version: [AGENTS_RU.md](./AGENTS_RU.md)

## What this is

**nextjs-super-boilerplate** — a production-ready Next.js 16 (App Router) boilerplate for quickly starting new projects. Out of the box: infrastructure (Docker, CI/CD, nginx, HTTPS), JWT auth + OAuth, article CMS (editor, preview, publish), SEO (metadata, JSON-LD, sitemap, RSS, IndexNow), notifications (web-push, email, Telegram), LLM features, analytics (RUM, AI-referrals), metrics (Prometheus/Grafana/Loki), i18n, admin UI.

It is a standalone Next.js app (not a workspaces monorepo), self-hosted stack: no Stripe/billing or multi-tenant SaaS.

Demo: https://nextjs-super-boilerplate.visn-ai.io

## Stack

- **Runtime:** Node.js ≥ 22 (engines), `.nvmrc` pins v24; package manager **pnpm** (`pnpm-lock.yaml`, security overrides live in `pnpm-workspace.yaml`)
- **Framework:** Next.js 16 (App Router), React 19, TypeScript 5 (strict)
- **Data:** MongoDB (mongoose), Redis (ioredis) — caching and rate limiting (`rate-limiter-flexible`)
- **UI:** Tailwind CSS 4, Radix UI / shadcn-style components (`src/components/ui`), lucide-react, framer-motion, SCSS
- **Editor:** TipTap 3 (+ Yjs collaboration)
- **Client data:** react-query v3, react-hook-form, axios
- **Auth:** JWT (access + refresh, `jsonwebtoken`), bcryptjs, TOTP MFA (`otplib`), OAuth (Yandex, Google, GitHub) with PKCE
- **LLM:** OpenAI SDK, server-side keys, `NEXT_PUBLIC_LLM_ENABLED` flag

## Commands

```bash
pnpm install                # dependencies
cp .env.example .env.local  # env, then fill in values
pnpm doctor                 # validate .env.local (scripts/doctor.ts)
make up-local               # local MongoDB (docker-compose.dev.yml); make down-local — stop
pnpm dev:local              # dev server, http://localhost:3000

make setup                  # repeatable local onboarding (scripts/setup-local.sh): tops up keys, fills empty, runs doctor
pnpm gates                  # scripts/check-*.mjs — agent contract size, eslint-disable ratchet (part of CI `quality`)
pnpm lint / lint:fix        # ESLint
pnpm typecheck              # tsc --noEmit
pnpm test                   # node --test via tsx (*.test.ts, scripts/telegram/*.test.mjs) — no infrastructure needed
pnpm format                 # prettier over src/**/*.ts
pnpm build:local|stage|prod # build with env-cmd for the target env
```

Pre-commit: husky + lint-staged (`pnpm lint:src` over staged files in `src/`).

## Structure

```
config/          product configuration (edited when forking)
  product.ts     branding, author, PWA, sitemap extras — first customization point
  env.ts         reads all env vars, feature flags (ACCOUNT_CONFIG etc.)
  auth-oauth.ts, password-policy.ts, notification-events.ts

lib/             server-side code (outside src): DB, services, security
  db/            client.ts + mongoose models (User, Article, RefreshToken, OAuthAccount,
                 PushSubscription, SecurityAuditLog, LlmChatSession, RumWebVital, ...)
  services/      business logic: auth, registration, password, email, llm, media,
                 notifications, security-audit, i18n, rum-dashboard, ...
  security/      rate-limit, bruteforce, totp, login-challenge, llm-rate-limit
  oauth/         full OAuth flow: state, PKCE, providers, collision handling
  middleware/    auth-middleware, rate-limit-middleware, api-error-handler
  jwt/, redis.ts, cache.ts, cookies.ts, server-action/, validation/, error/

src/
  app/           App Router: pages + API routes (app/api/v1/*), sitemap, robots, rss, manifest
  api/           client-side API layer (axios clients, model.ts/types.ts per domain)
  query/         react-query hooks (query/mutation) for the same domains
  components/    ui (base), Blocks, Views, Layouts, Fields, Guard, ...
  lib/           client/shared utils: auth, seo, i18n, editor, sanitize, theme, routes
  providers/     React providers: auth, theme, i18n, push, notify, query, Rum
  constants/routes.ts   paths + seo.sitemap / seo.breadcrumb
  proxy.ts       Next.js proxy (Content-Signal etc.)

mcp/             MCP stdio server for AI agents (server.ts, registry.ts, tools/*.mcp.ts) — see mcp/README.md

.docker/         Dockerfiles (app, nginx, certbot), nginx configs, supervisor
.github/workflows/  ci.yml + quality.yml (gates/lint/typecheck/test), prod-deploy.yml (deploy to VPS),
                 lighthouse.yml, notify-telegram.yml, ci-secret-scan.yml — see docs/CI_TELEGRAM_LIGHTHOUSE_RU.md
docs/            all documentation (see docs/README.md — index)
scripts/         doctor.ts (env validation), local-containers-run.sh, notify-telegram.sh
patch/           git patches with history of major features (reference)
skills/          NSB_SETUP_SKILL.md — boilerplate setup skill
```

API routes live in `src/app/api/v1/*` (auth, article, llm, media, notification, push, rum, seo, user, admin, healthcheck, ...). Domain pattern: `src/api/<domain>` (HTTP client) → `src/query/<domain>` (react-query hooks) → components; server logic in `lib/services`.

## Path aliases (tsconfig)

- `@config/*` → `./config/*`
- `@lib/*` → `./lib/*`
- `~/*` → `./src/*`

## Env and environments

Three environments: `.env.local`, `.env.stage`, `.env.prod` (scripts via `env-cmd`). Template — `.env.example`, full variable reference — `docs/ENV_REFERENCE.md`. Key vars: `JWT_SECRET`, `MONGO_URI` (or MONGO_HOST/USER/PASSWORD/DB), `REDIS_URL`, VAPID keys (push), `MFA_ENCRYPTION_KEY`, `FIRST_ADMIN_LOGIN/PASSWORD`, OAuth keys, `NEXT_PUBLIC_LLM_ENABLED` + OpenAI. After editing env — run `pnpm doctor`.

Secrets are never committed; server-side keys (OpenAI etc.) never reach the client — only `NEXT_PUBLIC_*` vars are public.

## Code conventions

- TypeScript strict; ESLint flat config (`eslint.config.mjs`): next/core-web-vitals + typescript, prettier, simple-import-sort, import, jsdoc, react-refresh
- Prettier: `.prettierrc` (semi: false etc.) — formatting enforced via ESLint plugin
- Tests: native `node --test` via tsx, `*.test.ts` files colocated with code
- UGC sanitization: `isomorphic-dompurify` (`src/lib/sanitize`)
- API errors: custom errors in `lib/error/custom-errors.ts` + `lib/middleware/api-error-handler.ts`
- Rate limiting on API routes via `lib/middleware/rate-limit-middleware.ts`

## Infrastructure and deploy

- Deploy: GitHub Actions (`prod-deploy.yml` on push to `main`; a stage workflow is a copy of it with `develop` + `.env.stage`) to a VPS via Docker Compose
- Compose files: `docker-compose.dev.yml` (local mongo/nginx), `docker-compose.local.yml` (full stack locally)
- Production stack: app + nginx + certbot (Let's Encrypt) + Redis + MongoDB (optional) + metrics (Prometheus, Grafana, Loki)
- Blue-green deploy and memory limits — see `docs/INFRA_HARDENING_PLAYBOOK_RU.md`

## Documentation — where to look

- `docs/README.md` — index of all documentation
- `docs/GETTING_STARTED.md` (RU) — fork checklist: product.ts, env, verification files
- `docs/CONFIGURATION.md` (RU) — feature flags: auth, email, MFA, sessions, onboarding, push, LLM
- `docs/ENV_REFERENCE.md` — all environment variables
- `docs/DECISIONS_RU.md` — decision journal: why things are the way they are (append-only, dated)
- `docs/agents/review.md`, `docs/agents/triage.md` — how to review a PR, how to file an issue
- `docs/plans/README.md` — plans for large work
- `docs/CI_TELEGRAM_LIGHTHOUSE_RU.md` — CI: Telegram notifications, Lighthouse budgets, secret scan, gates
- `docs/AUTH_OAUTH.md`, `docs/SECURITY_AND_ACCOUNT_ROADMAP.md` — auth/security (implemented)
- `docs/SECURITY_HARDENING_PLAYBOOK_RU.md`, `docs/SECURITY_SEO_AUDIT.md` — hardening
- Roadmaps: `PRODUCT_ROADMAP.md`, `AI_FEATURES_ROADMAP.md`, `IMPROVEMENTS_ROADMAP.md`

## MCP server and machine auth (PAT)

The repo ships an MCP stdio server (`mcp/`) exposing the articles + media domains as tools for MCP hosts (Claude Desktop, Cursor, Claude Code). Auth is a Personal Access Token (`nsb_pat_…`) issued at `/admin/api-tokens` (flag `API_TOKENS_ENABLED`), sent as `Authorization: Bearer` to the regular REST `/api/v1/*` — scopes (`articles:read|write|publish|seo`, `media:read|write`), per-token rate limit and `SecurityAuditLog` audit are enforced server-side by `withApiTokenOrAuth` (`lib/middleware/api-token-middleware.ts`).

When adding a new domain that should be MCP-accessible: add scopes to `src/api/api-token/model.ts`, wrap the routes with `withApiTokenOrAuth('<scope>')` (fine-grained checks via `hasApiTokenScope`), create `mcp/tools/<domain>.mcp.ts` and register it in `mcp/tools/index.ts`. Tools must stay thin wrappers over REST — no business logic in `mcp/`. Details: `mcp/README.md`, design doc `docs/MCP_ARTICLES_SERVER_RU.md`.

## Rules for agents

This file is the single contract for people and agents (Claude, Codex, Cursor). `CLAUDE.md` is a
thin Claude Code adapter that imports it and adds only runtime notes; keep project rules here,
never in adapters. Budget: under 28 KB and no `@file` imports — `pnpm gates`
(`check-agent-contract`) enforces both, because Codex truncates instructions silently past 32 KB
and does not expand imports. Nothing here restates what eslint, tsc or CI already check: their
message is the source of truth, and a retelling drifts on the first edit.

### What wins on conflict (top to bottom)

1. **Nothing irreversible or externally visible without the owner's explicit word for that exact
   action:** `git push`, a manual deploy (`workflow_dispatch`), any command touching `.env.prod` /
   `.env.stage`, writes to a live database, restore from backup, sending to external services,
   secret rotation. One approval covers one action. Everything internal — code, files, search,
   installs, read-only queries — do yourself and report.
2. **A direct instruction from the owner in the current session.**
3. **Correctness and security:** auth and role checks, per-user scoping, secrets never in logs or
   client DTOs, server-side validation.
4. **Truth about state.** Never present unrun as run, unfound as absent, assumed as verified.
   A red report is cheaper than a green one that lies.
5. **Documentation discipline** (below). Yields to urgency — but say so out loud.
6. Everything else: style, defaults, preferences.

If a request conflicts with 1–3, stop and say what the conflict is. With 4–6, do it and name the
deviation.

### Size the work first

| Size | What | What is enough |
|---|---|---|
| Small | text, i18n, layout, a comment, a one-file rename | edit + `pnpm typecheck`; skip everything else and do not explain why |
| Medium | several files inside one domain | the narrowest check that covers the change + a test for new pure logic |
| Large | new entity or domain, Mongo schema change, external contract (API, MCP tool, webhook), state machine, data migration, auth flow | plan first (`docs/plans/`), agree, then code |

### Done and enough

- "Done" is proven by fresh command output in the current run, not by "should work". A failing
  test is reported with its output; a skipped step is named as skipped. For text, i18n and layout
  `tsc` proves nothing — the proof is a running `dev:local` and a seen screen, or an honest "not
  checked by eye".
- Do not add guards, layers, abstractions or fallbacks nobody asked for and the system cannot
  reach. Skip them without explaining why you skipped.
- Do not wrap a mandatory dependency in `try/catch`: if Mongo or Redis is down, fail loudly.
- No renames or reformatting outside the task: they bloat the diff the owner reads by eye and
  hide the real change.
- Comments only where a reader who already understands the next line would still be confused —
  about the *why*. Rationale goes into the commit body or `docs/DECISIONS_RU.md`.
- Never silently narrow scope. Found a bug outside the task — fix it and say so separately, or
  name it.
- A green test's guarantee is untouchable: do not weaken an expectation, fit expected to new
  output, disable a test or reduce it to checking a mock.

### Tests

New code comes with a test when the behaviour is checkable without infrastructure. Tests live
next to the code (`*.test.ts`, `scripts/**/*.test.mjs`) and run with native `node --test` via tsx.
`pnpm test` must stay runnable with no database, no Redis, no network — a suite that needs
infrastructure gets skipped, and a skipped suite reports green. Front-end logic is tested by
extracting pure functions; render tests are deliberately not set up. Hooks will not run on your
path: `pre-push` never (you do not push), `pre-commit` runs no tests — run `pnpm test` yourself
before showing the diff. If a check needs infrastructure you do not have (`make up-local`), say it
was not checked: `ECONNREFUSED` is a missing stand, not a code defect.

### What machines already catch

A failing gate is a reason to ask why the rule exists, not to bypass it; the list of known
exceptions can only shrink.

| Check | Where | What it stops |
|---|---|---|
| `check-agent-contract` | `pnpm gates` | `AGENTS.md` over 28 KB or with `@file` imports; `CLAUDE.md` without `@AGENTS.md` or over 4 KB |
| `check-eslint-disable-ratchet` | `pnpm gates` | A new `eslint-disable` (baseline `scripts/eslint-disable-ratchet-baseline.txt`; shrink it with `--update`) |
| eslint `no-restricted-syntax` | `pnpm lint` | Raw `<input>/<select>/<textarea>` outside `src/components/ui`; bare `<span>` text instead of `Typography` |
| `gitleaks` | `Secret scan` workflow | New secret material in tracked files |
| `Lighthouse` | `lighthouse.yml` | Public pages heavier than the `lighthouserc.json` budgets (weight and CLS block, timings warn) |
| `guard-external.sh` | Claude Code `PreToolUse` (`.claude/settings.json`) | Running `git push`, any `pnpm <script>:prod` / `:stage` (build, start, worker, doctor), commands naming `.env.prod` / `.env.stage`, running `restore-mongo.sh` / `mongorestore` |

### Documentation discipline

A code change without the doc change is an unfinished task.

- A decision someone may want to revert → dated entry in `docs/DECISIONS_RU.md` (why, and why not otherwise)
- New env variable → `.env.example` with a comment + `docs/ENV_REFERENCE.md`
- Plan for large work → `docs/plans/`
- New document → a row in `docs/README.md`
- Keep `AGENTS.md` and `AGENTS_RU.md` in sync

### Project conventions

- When starting a new feature, follow an existing domain as a template (e.g. `article`): api → query → app/api/v1 → services → models
- If a new domain should be usable by AI agents, expose it through the MCP registry (see "MCP server and machine auth" above)
- Do not change `pnpm-workspace.yaml` overrides without reason — they are security fixes for transitive dependencies
- When forking for a new product, edit `config/product.ts` and `.env.local` first, then run `pnpm doctor`; repeat onboarding (new machine, new keys in the template) is `make setup`
- Before committing: `pnpm gates`, `pnpm lint`, `pnpm typecheck`, `pnpm test`
