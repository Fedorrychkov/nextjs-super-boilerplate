# nextjs-super-boilerplate

Production-ready Next.js 16 (App Router) starter for self-hosted products: JWT auth + OAuth + TOTP MFA,
article CMS (editor, preview, publish), SEO (metadata, JSON-LD, sitemap, RSS, IndexNow), web-push /
email / Telegram notifications, optional LLM features, RUM analytics, admin UI, MCP server for AI
agents, and a full Docker stack (nginx, HTTPS, Redis, MongoDB, Prometheus / Grafana / Loki) deployed
by GitHub Actions to a VPS.

Demo: **https://nextjs-super-boilerplate.visn-ai.io** · Article: [RU](https://github.com/Fedorrychkov/fedorrychkov/blob/main/articles/standalone-nextjs-production-ready-boilerplate/ARTICLE_RU.md) · [EN](https://github.com/Fedorrychkov/fedorrychkov/blob/main/articles/standalone-nextjs-production-ready-boilerplate/ARTICLE_EN.md)

**Scope.** A self-hosted full-stack + content stack with CI/CD, not a hosted page builder. No
Stripe/billing and no multi-tenant SaaS monetization — wire payments or swap pieces as needed.

## Quick start

```bash
pnpm install
./scripts/init-project.sh   # fresh fork: renames placeholders, generates secrets into .env.local, runs doctor
pnpm dev:local              # http://localhost:3000
```

Already forked (new machine, new keys in the template)? `make setup` tops up `.env.local` and runs
`pnpm doctor`. Local MongoDB: `make up-local`. Everything else — in the docs.

## Documentation

| Start with | |
|---|---|
| [`docs/start/getting-started.en.md`](./docs/start/getting-started.en.md) · [RU](./docs/start/getting-started.ru.md) | First hour: env, `config/product.ts`, routes, `public/` files, feature flags |
| [`docs/start/local-development.en.md`](./docs/start/local-development.en.md) | Local MongoDB, connecting from your machine, local HTTPS via nginx |
| [`docs/configure/env-reference.en.md`](./docs/configure/env-reference.en.md) · [RU](./docs/configure/env-reference.ru.md) | Every environment variable, same order as `.env.example` |
| [`docs/deploy/github-actions.en.md`](./docs/deploy/github-actions.en.md) | Deploy workflow inputs and secrets, DNS, VPS setup, troubleshooting, backups |
| [`docs/README.md`](./docs/README.md) | Full index: configure, deploy, develop, security, roadmaps, decisions, agents |

Working with AI agents (Claude Code, Codex, Cursor): the contract is [`AGENTS.md`](./AGENTS.md)
([RU](./AGENTS_RU.md)); `CLAUDE.md` is a thin adapter.

## Commands

```bash
pnpm doctor       # validate .env.local against config/env.ts
pnpm gates        # scripts/check-*.mjs: agent contract, eslint-disable ratchet, docs structure, env reference
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm test         # node --test, no infrastructure needed
```

CI runs the same four on every PR (`quality.yml`), plus gitleaks, Lighthouse budgets for public
pages and Telegram notifications — [`docs/deploy/ci-notifications-lighthouse.ru.md`](./docs/deploy/ci-notifications-lighthouse.ru.md).

## License

[MIT](./LICENSE).
