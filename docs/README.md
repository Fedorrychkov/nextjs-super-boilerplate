# Documentation index

Planning, configuration, and FAQ. Root **[`README.md`](../README.md)** — local run, deploy, troubleshooting.

## Start here (v0.2.4)

| File | Language | Purpose |
|------|----------|---------|
| [`GETTING_STARTED.md`](./GETTING_STARTED.md) | RU | Fork checklist + `scripts/init-project.sh` (rename, secrets, VAPID) |
| [`CONFIGURATION.md`](./CONFIGURATION.md) | RU | Feature flags: auth, email, MFA, sessions, onboarding, push, LLM |
| [`ENV_REFERENCE.md`](./ENV_REFERENCE.md) | EN/RU table | All environment variables |
| [`../CHANGELOG.md`](../CHANGELOG.md) | EN | Release notes |

## Roadmaps & plans

| File | Language | Purpose |
|------|----------|---------|
| [`PRODUCT_ROADMAP.md`](./PRODUCT_ROADMAP.md) | EN | Article platform, editor, SEO, analytics |
| [`SECURITY_AND_ACCOUNT_ROADMAP.md`](./SECURITY_AND_ACCOUNT_ROADMAP.md) | RU | Account security — **implemented** (phases 1–5) |
| [`AUTH_OAUTH.md`](./AUTH_OAUTH.md) | RU | OAuth / social login — **implemented** (Yandex, Google, GitHub) |
| [`AI_FEATURES_ROADMAP.md`](./AI_FEATURES_ROADMAP.md) | EN | LLM, markdown for agents |
| [`IMPROVEMENTS_ROADMAP.md`](./IMPROVEMENTS_ROADMAP.md) | EN | GEO / discoverability |
| [`I18N_ADMIN_TRANSLATIONS_ROADMAP.md`](./I18N_ADMIN_TRANSLATIONS_ROADMAP.md) | EN | Admin-managed i18n translations |

## Infrastructure & deploy

| File | Language | Purpose |
|------|----------|---------|
| [`INFRASTRUCTURE_PLAN.md`](./INFRASTRUCTURE_PLAN.md) | EN | Deploy vs Plan A/B |
| [`INFRASTRUCTURE_PLAN_RU.md`](./INFRASTRUCTURE_PLAN_RU.md) | RU | Same (Russian) |
| [`INFRASTRUCTURE_TODO_RU.md`](./INFRASTRUCTURE_TODO_RU.md) | RU | VPS / CI backlog (§3 mongo logs, §5 backups — **implemented**) |
| [`INFRA_HARDENING_PLAYBOOK_RU.md`](./INFRA_HARDENING_PLAYBOOK_RU.md) | RU | Memory limits, blue/green — porting to BP & children |
| [`CRON_ARCHITECTURE_PORTABLE_RU.md`](./CRON_ARCHITECTURE_PORTABLE_RU.md) | RU | Background worker & crons (BullMQ, `scripts/worker.ts`) |
| [`MONGO_BACKUPS_RU.md`](./MONGO_BACKUPS_RU.md) | RU | Local mongo backups (`backup-mongo.sh`), restore, cron |
| [`DOCKER_COMPOSE_V2_RU.md`](./DOCKER_COMPOSE_V2_RU.md) | RU | Docker install + compose v1↔v2 compatibility |
| [`CI_QUALITY_GATE_E2E_RU.md`](./CI_QUALITY_GATE_E2E_RU.md) | RU | CI quality gate + shared cache — **implemented** |
| [`CI_PIPELINE_UPDATE_GUIDE_RU.md`](./CI_PIPELINE_UPDATE_GUIDE_RU.md) | RU | Portable CI update (patch [`../patch/ci-pipeline-update.patch`](../patch/ci-pipeline-update.patch)) for other repos |

## MCP & machine access

| File | Language | Purpose |
|------|----------|---------|
| [`MCP_ARTICLES_SERVER_RU.md`](./MCP_ARTICLES_SERVER_RU.md) | RU | MCP server for articles/media (stdio + remote HTTP) |
| [`MCP_OAUTH_DESIGN_RU.md`](./MCP_OAUTH_DESIGN_RU.md) | RU | OAuth layer for MCP — design |
| [`MCP_OAUTH_PORTING_RU.md`](./MCP_OAUTH_PORTING_RU.md) | RU | Porting MCP OAuth + machine access to downstream projects |

## Frontend & content conventions

| File | Language | Purpose |
|------|----------|---------|
| [`TYPOGRAPHY_UNIFICATION_RU.md`](./TYPOGRAPHY_UNIFICATION_RU.md) | RU | Typography component migration + eslint enforcement |
| [`FIELD_COMPONENTS_UNIFICATION_RU.md`](./FIELD_COMPONENTS_UNIFICATION_RU.md) | RU | Field components unification + enforcement |
| [`SIDEBAR_NAVIGATION_FIX_RU.md`](./SIDEBAR_NAVIGATION_FIX_RU.md) | RU | Sidebar navigation — design note |
| [`ARTICLE_TRANSLATION_GROUP_SEO.md`](./ARTICLE_TRANSLATION_GROUP_SEO.md) | RU | Cross-language article groups + SEO pipeline |

## Security audits

| File | Language | Purpose |
|------|----------|---------|
| [`SECURITY_HARDENING_PLAYBOOK_RU.md`](./SECURITY_HARDENING_PLAYBOOK_RU.md) | RU | Security hardening playbook |
| [`SECURITY_SEO_AUDIT.md`](./SECURITY_SEO_AUDIT.md) | RU | Security & SEO audit |

## FAQ

| File | Language |
|------|----------|
| [`FAQ_EN.md`](./FAQ_EN.md) | EN |
| [`FAQ_RU.md`](./FAQ_RU.md) | RU |

## Configuration map

```
config/product.ts     → branding, author, PWA, sitemap extras
config/env.ts         → secrets & feature flags (ACCOUNT_CONFIG, …)
config/password-policy.ts
src/constants/routes.ts → paths + seo.sitemap / seo.breadcrumb
```

Run `pnpm doctor` after editing `.env.local`. On a fresh fork, `./scripts/init-project.sh` scaffolds it for you.
