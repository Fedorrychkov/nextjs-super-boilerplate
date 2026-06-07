# Changelog

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
- Docs: `GETTING_STARTED.md`, `CONFIGURATION.md`, `ENV_REFERENCE.md`

### Docs

- Updated `SECURITY_AND_ACCOUNT_ROADMAP.md` (phases 1–5 implemented)

---

## [0.1.x] — earlier

- Auth, articles CMS, SEO baseline, deploy stack, LLM editor, notifications — see git history and product roadmaps.
