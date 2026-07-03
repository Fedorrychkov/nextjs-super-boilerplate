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

pnpm lint / lint:fix        # ESLint
pnpm typecheck              # tsc --noEmit
pnpm test                   # node --test via tsx (*.test.ts)
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

.docker/         Dockerfiles (app, nginx, certbot), nginx configs, supervisor
.github/workflows/  stage-deploy.yml, prod-deploy.yml (deploy to VPS)
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

- Deploy: GitHub Actions (`stage-deploy.yml` / `prod-deploy.yml`) to a VPS via Docker Compose
- Compose files: `docker-compose.dev.yml` (local mongo/nginx), `docker-compose.local.yml` (full stack locally)
- Production stack: app + nginx + certbot (Let's Encrypt) + Redis + MongoDB (optional) + metrics (Prometheus, Grafana, Loki)
- Blue-green deploy and memory limits — see `docs/INFRA_HARDENING_PLAYBOOK_RU.md`

## Documentation — where to look

- `docs/README.md` — index of all documentation
- `docs/GETTING_STARTED.md` (RU) — fork checklist: product.ts, env, verification files
- `docs/CONFIGURATION.md` (RU) — feature flags: auth, email, MFA, sessions, onboarding, push, LLM
- `docs/ENV_REFERENCE.md` — all environment variables
- `docs/AUTH_OAUTH.md`, `docs/SECURITY_AND_ACCOUNT_ROADMAP.md` — auth/security (implemented)
- `docs/SECURITY_HARDENING_PLAYBOOK_RU.md`, `docs/SECURITY_SEO_AUDIT.md` — hardening
- Roadmaps: `PRODUCT_ROADMAP.md`, `AI_FEATURES_ROADMAP.md`, `IMPROVEMENTS_ROADMAP.md`

## Rules for agents

- When starting a new feature, follow an existing domain as a template (e.g. `article`): api → query → app/api/v1 → services → models
- Do not change `pnpm-workspace.yaml` overrides without reason — they are security fixes for transitive dependencies
- When forking for a new product, edit `config/product.ts` and `.env.local` first, then run `pnpm doctor`
- Before committing: `pnpm lint`, `pnpm typecheck`, `pnpm test`
- Keep `AGENTS.md` and `AGENTS_RU.md` in sync when updating either
