# Changelog

## [Unreleased]

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
- Docs: `GETTING_STARTED.md`, `CONFIGURATION.md`, `ENV_REFERENCE.md`

### Docs

- Updated `SECURITY_AND_ACCOUNT_ROADMAP.md` (phases 1–5 implemented)

---

## [0.1.x] — earlier

- Auth, articles CMS, SEO baseline, deploy stack, LLM editor, notifications — see git history and product roadmaps.
