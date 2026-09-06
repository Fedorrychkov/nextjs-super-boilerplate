# Getting started

Русская версия: [getting-started.ru.md](./getting-started.ru.md)

The first hour after a fork. Infrastructure (Docker, CI, nginx) lives in
[`../deploy/github-actions.en.md`](../deploy/github-actions.en.md); day-to-day commands in
[`local-development.en.md`](./local-development.en.md).

## 0. One command

```bash
pnpm install
./scripts/init-project.sh    # fresh fork only
```

The script asks for slug / name / domain / author, renames the hardcoded placeholders
(`package.json`, `config/product.ts`, `prod-deploy.yml`, GitHub OAuth User-Agent, `Makefile`),
creates `.env.local` from `.env.example` with generated `JWT_SECRET`, `MFA_ENCRYPTION_KEY`,
`SEO_NOTIFY_SECRET` and VAPID keys, saves a copy of them into the gitignored `.project-initialized`
(from there into the CI secret store for prod), and runs `pnpm doctor`. It runs once (guard file).

Every later time — new machine, new teammate, a key added to the template — run `make setup`: it
tops up missing keys from `.env.example`, fills only the empty ones and finishes with the doctor.
Non-empty values are never touched.

## 1. Fill in what is yours

| Step | What |
|---|---|
| 1 | `.env.local`: MongoDB (`MONGO_*` or `MONGO_URI`), `REDIS_URL`, `FIRST_ADMIN_*` — every variable is in [`../configure/env-reference.en.md`](../configure/env-reference.en.md) |
| 2 | `pnpm doctor` — consistency of env and feature flags |
| 3 | [`config/product.ts`](../../config/product.ts) — description, `author: null` for a SaaS without a public author, PWA colours and icons |
| 4 | `make up-local` (local MongoDB) or an external `MONGO_URI` |
| 5 | `pnpm dev:local` — http://localhost:3000 |
| 6 | Sign in as the first admin (`FIRST_ADMIN_*`, created on start) |

## 2. `config/product.ts` — the product passport

One file for branding (no secrets):

- **name / shortName / description / defaultTitle** — metadata, Open Graph, PWA manifest (`src/app/manifest.ts`)
- **author** — `null` hides JSON-LD Person and article bylines
- **links.github / links.demo** — homepage; `null` disables the SoftwareApplication schema
- **schema.person / schema.softwareApplication** — which JSON-LD blocks render on the homepage
- **pwa** — manifest colours and icons
- **sitemapExtras** — static URLs outside `routes.ts` (e.g. `/rss.xml`)

The site URL comes **only from env**: `NEXT_PUBLIC_SITE_URL`. Organization social links:
`NEXT_PUBLIC_ORGANIZATION_SAME_AS`.

## 3. Routes and SEO

[`src/constants/routes.ts`](../../src/constants/routes.ts) — path, auth, **seo**:

```ts
seo: {
  sitemap: { priority: 0.9, changeFrequency: 'weekly' },
  breadcrumb: true,
  breadcrumbOrder: 2,
}
```

From this the XML sitemap (`src/lib/seo/sitemap.ts`) and article breadcrumbs in JSON-LD
(`src/lib/seo/jsonld.tsx`) are built. A new public page → add a route with `seo.sitemap`.

## 4. Files in `public/` (replace by hand)

| File | Purpose |
|---|---|
| `public/BingSiteAuth.xml` | Bing Webmaster verification |
| `public/<indexnow-key>.txt` | IndexNow (name = `INDEXNOW_API_KEY`) |
| `public/llms.txt` | Hints for AI crawlers |
| `public/images/*` | favicon, OG image, PWA icons |

The static `public/images/site.webmanifest` is obsolete — the manifest is served from `src/app/manifest.ts`.

## 5. Turning features on

Details: [`../configure/feature-flags.ru.md`](../configure/feature-flags.ru.md) (RU). A common minimal prod set:

```bash
AUTH_PASSWORD_CHANGE_ENABLED=1
AUTH_PASSWORD_FORGOT_ENABLED=1
AUTH_SESSIONS_ENABLED=1
NOTIFY_LOGIN_ENABLED=1
EMAIL_SEND_MODE=elastic
EMAIL_API_KEY=...
```

Onboarding, push, LLM, OAuth, API tokens / MCP — all behind flags, all off by default.

## 6. Before the first deploy

- Repository secrets: `WEB_ENV_PROD` (the env file content), SSH access, `GHCR_*`, optionally
  `TG_*` for notifications — [`../deploy/github-actions.en.md`](../deploy/github-actions.en.md).
- `doctor_check_enabled: true` in `prod-deploy.yml` runs `pnpm doctor:prod` on the assembled env
  before anything touches the server. If it is red, the env is wrong, not the gate.
- Working with AI agents: [`../../AGENTS.md`](../../AGENTS.md) is the contract; `pnpm gates` keeps
  it within limits.

## 7. Next

- [`local-development.en.md`](./local-development.en.md) — commands, local HTTPS, connecting to a server DB
- [`../configure/env-reference.en.md`](../configure/env-reference.en.md) — every variable
- [`../security/account-security.ru.md`](../security/account-security.ru.md) (RU) — what the security block implements
- [`../../CHANGELOG.md`](../../CHANGELOG.md) — release notes
