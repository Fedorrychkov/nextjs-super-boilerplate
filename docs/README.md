# Documentation index

Folders by topic; language is the suffix (`.ru.md` / `.en.md`). Russian is canonical, English exists
for the entry documents. `pnpm gates` (`check-docs-structure`) keeps this index complete and every
relative link alive.

## Start

| File | Purpose |
|---|---|
| [`start/getting-started.en.md`](./start/getting-started.en.md) · [RU](./start/getting-started.ru.md) | First hour after a fork: `init-project.sh` / `make setup`, product.ts, routes, `public/` files, flags |
| [`start/local-development.en.md`](./start/local-development.en.md) | Commands, local MongoDB, connecting to a server DB, local HTTPS |
| [`start/faq.en.md`](./start/faq.en.md) · [RU](./start/faq.ru.md) | Recipes: Mongo reset, clean script, certbot email, disk |

## Configure

| File | Purpose |
|---|---|
| [`configure/env-reference.en.md`](./configure/env-reference.en.md) · [RU](./configure/env-reference.ru.md) | Every environment variable, same order as `.env.example` |
| [`configure/feature-flags.ru.md`](./configure/feature-flags.ru.md) | Feature flags: auth, email, MFA, sessions, onboarding, push, LLM |
| [`configure/oauth.ru.md`](./configure/oauth.ru.md) | OAuth / social login — implemented (Yandex, Google, GitHub) |

## Deploy

| File | Purpose |
|---|---|
| [`deploy/github-actions.en.md`](./deploy/github-actions.en.md) | Workflow inputs and secrets, DNS, VPS, monitoring, troubleshooting, backups |
| [`deploy/ci-notifications-lighthouse.ru.md`](./deploy/ci-notifications-lighthouse.ru.md) | CI: Telegram notifications, Lighthouse budgets, secret scan, gates |
| [`deploy/hardening-playbook.ru.md`](./deploy/hardening-playbook.ru.md) | Memory limits, blue/green — porting to downstream projects |
| [`deploy/background-worker.ru.md`](./deploy/background-worker.ru.md) | Background worker and crons (BullMQ, `scripts/worker.ts`) |
| [`deploy/mongo-backups.ru.md`](./deploy/mongo-backups.ru.md) | Local mongo backups, restore, cron |
| [`deploy/docker-compose-v2.ru.md`](./deploy/docker-compose-v2.ru.md) | Docker install, compose v1 ↔ v2 |
| [`deploy/ci-quality-gate.ru.md`](./deploy/ci-quality-gate.ru.md) | CI quality gate and shared cache — implemented |
| [`deploy/ci-pipeline-update-guide.ru.md`](./deploy/ci-pipeline-update-guide.ru.md) | Porting the CI update to other repos (`patch/ci-pipeline-update.patch`) |
| [`deploy/infrastructure-plan.en.md`](./deploy/infrastructure-plan.en.md) · [RU](./deploy/infrastructure-plan.ru.md) | Deploy today vs Plan A (hardened single server) / Plan B (Kubernetes) |
| [`deploy/infrastructure-backlog.ru.md`](./deploy/infrastructure-backlog.ru.md) | VPS / CI backlog (§3 mongo logs, §5 backups — implemented) |

## Develop

| File | Purpose |
|---|---|
| [`develop/bundle-optimization.en.md`](./develop/bundle-optimization.en.md) | Bundle analysis, lazy loading, HTTP caching, metrics stack on small servers |
| [`develop/typography.ru.md`](./develop/typography.ru.md) | Typography component migration + eslint enforcement |
| [`develop/field-components.ru.md`](./develop/field-components.ru.md) | Field components unification + enforcement |
| [`develop/sidebar-navigation.ru.md`](./develop/sidebar-navigation.ru.md) | Sidebar navigation — design note |
| [`develop/article-translation-groups.ru.md`](./develop/article-translation-groups.ru.md) | Cross-language article groups + SEO pipeline |
| [`develop/mcp-server.ru.md`](./develop/mcp-server.ru.md) | MCP server for articles/media (stdio + remote HTTP); see also [`../mcp/README.md`](../mcp/README.md) |
| [`develop/mcp-oauth-design.ru.md`](./develop/mcp-oauth-design.ru.md) | OAuth layer for MCP — design |
| [`develop/mcp-oauth-porting.ru.md`](./develop/mcp-oauth-porting.ru.md) | Porting MCP OAuth + machine access downstream |

## Security

| File | Purpose |
|---|---|
| [`security/account-security.ru.md`](./security/account-security.ru.md) | Account security — implemented (phases 1–5) |
| [`security/hardening-playbook.ru.md`](./security/hardening-playbook.ru.md) | Security hardening playbook |
| [`security/security-seo-audit.ru.md`](./security/security-seo-audit.ru.md) | Security and SEO audit |

## Agents, decisions, plans

| File | Purpose |
|---|---|
| [`../AGENTS.md`](../AGENTS.md) · [RU](../AGENTS_RU.md) | Contract for people and AI agents; `CLAUDE.md` is a thin adapter |
| [`agents/review.ru.md`](./agents/review.ru.md) | How to review a PR: what a finding is, priorities, what CI already catches |
| [`agents/triage.ru.md`](./agents/triage.ru.md) | Issues: labels, what an issue must contain |
| [`decisions/journal.ru.md`](./decisions/journal.ru.md) | Decision journal — why things are the way they are (append-only, `§N`) |
| [`plans/README.md`](./plans/README.md) | Plans for large work: when one is needed and what goes in |
| [`audits/2026-09-boilerplate-vs-children.ru.md`](./audits/2026-09-boilerplate-vs-children.ru.md) | Audit against downstream projects: what was ported, what is left |

## Roadmaps

Direction, not a queue: an item becomes an issue when it is taken into work.

| File | Purpose |
|---|---|
| [`roadmaps/product.en.md`](./roadmaps/product.en.md) | Article platform, editor, SEO, analytics |
| [`roadmaps/ai-features.en.md`](./roadmaps/ai-features.en.md) | LLM, markdown for agents |
| [`roadmaps/geo-discoverability.en.md`](./roadmaps/geo-discoverability.en.md) | GEO / discoverability |
| [`roadmaps/i18n-admin-translations.en.md`](./roadmaps/i18n-admin-translations.en.md) | Admin-managed i18n translations |

## Configuration map

```
.env.example            → template; docs/configure/env-reference.*  (same order, gated)
config/env.ts           → parsing and defaults, feature flags (ACCOUNT_CONFIG, …)
config/product.ts       → branding, author, PWA, sitemap extras
config/password-policy.ts
src/constants/routes.ts → paths + seo.sitemap / seo.breadcrumb
```

`pnpm doctor` after editing env. Release notes: [`../CHANGELOG.md`](../CHANGELOG.md).
