# Documentation index

Planning, configuration, and FAQ. Root **[`README.md`](../README.md)** — local run, deploy, troubleshooting.

## Start here (v0.2.0)

| File | Language | Purpose |
|------|----------|---------|
| [`GETTING_STARTED.md`](./GETTING_STARTED.md) | RU | Fork checklist: product.ts, env, public verification files |
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
| [`INFRASTRUCTURE_PLAN.md`](./INFRASTRUCTURE_PLAN.md) | EN | Deploy vs Plan A/B |
| [`INFRASTRUCTURE_PLAN_RU.md`](./INFRASTRUCTURE_PLAN_RU.md) | RU | Same (Russian) |
| [`INFRASTRUCTURE_TODO_RU.md`](./INFRASTRUCTURE_TODO_RU.md) | RU | VPS / CI backlog |

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

Run `pnpm doctor` after editing `.env.local`.
