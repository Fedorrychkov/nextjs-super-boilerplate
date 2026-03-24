# Product Roadmap (Content Platform)

This roadmap tracks the remaining work for the article platform and related quality requirements.

## Current Baseline

- Multi-step article editor is implemented (`Preview -> Content -> SEO -> Publish`).
- Public article page has dynamic SEO metadata and JSON-LD.
- Preview page is `noindex/nofollow`.
- Sitemap and RSS now include published public articles from DB.
- Publish flow already triggers search engine notifications for indexable public articles.
- Media pipeline: Uploadcare via own API (`/api/v1/media`), `MediaAsset` in DB, proxy delivery (`/cdn/...`), editor paste/drop + Preview/SEO image fields, responsive `<picture>` / `srcset` on public article HTML.
- Public article HTML path: **`unstable_cache`** + **`revalidateTag`** on publish/revision update (`src/lib/cache/publicArticlePageCache.ts`). RUM (Phase 4) + optional analytics cookie consent.

## Immediate Execution (Can Start Now)

- [ ] Add security test fixtures with common XSS payloads and run them in CI.
- [ ] Document canonical policy (`default from article URL + optional manual override in SEO step`).
- [ ] Add canonical URL normalization utility (protocol/host/trailing slash rules).
- [ ] Define publishing state-transition matrix (draft/confirmed/published/unpublished/republished).
- [ ] Add minimal publish pipeline logs (`publish_started`, `publish_succeeded`, `publish_failed`).
- [ ] Define initial Web Vitals SLO targets (p75 by route/device) before alert tuning.

---

## Phase 1 — Security and Content Safety (Highest Priority)

### 1. UGC sanitization pipeline

**Done for read-only HTML output only:** sanitization runs on the server after Tiptap static render (`finalizeArticleBodyHtml` → DOMPurify in `src/lib/sanitize/articleHtml.ts`) on public article, preview, and private article pages. **The TipTap editor surface is not passed through this pipeline** (authoring uses the live document; hardening there remains a separate decision).

- [x] Add server-side sanitization for user-generated HTML (DOMPurify via `isomorphic-dompurify` on the render path).
- [x] Define allowlist for tags/attributes based on current Tiptap extensions.
- [x] Enforce safe URL policy (`http/https`, safe relative paths, block `javascript:` / `data:` / protocol-relative URLs where enforced, strip inline event handlers via allowlist).
- [x] Add defense-in-depth sanitization before any `dangerouslySetInnerHTML` rendering (article + preview + private-article bodies).
- [x] Add unit tests with XSS payload fixtures (`npm run test`).
- [ ] Add security regression suite for known payloads in CI.

### 2. Safe rendering policy

- [ ] Document one canonical rendering path for article content (JSON -> static renderer -> sanitized HTML).
- [ ] Ensure preview/public rendering behavior is consistent.
- [ ] Add fallback behavior for malformed content payloads.
- [ ] Introduce baseline Content Security Policy for public article pages.

---

## Phase 2 — Publishing Workflow Completion

### 1. Revision lifecycle and publishing states

- [ ] Finalize “publish specific revision” contract (`article.revisionId`, `version`, statuses, timestamps).
- [x] Make confirmed/published revisions read-only in UI.
- [x] Add “create draft from published revision” action.
- [ ] Prevent editing of immutable revisions through backend validation.
- [ ] Define and document allowed state transitions as a single source of truth (state machine table).

### 2. Publishing side-effects robustness

- [ ] Add explicit handling for publish vs unpublish vs republish transitions.
- [ ] Add retry-safe notification logic for search engines.
- [ ] Add observability logs around publishing pipeline steps.
- [ ] Add integration tests for publish/unpublish/indexable/non-indexable scenarios.
- [ ] Add idempotency key handling for publish/unpublish operations to prevent duplicate side-effects.

### 3. Editor UX and media authoring

- [x] Add image paste/drop upload flow in editor (auto-upload and replace local blobs with CDN links).
- [x] Add thumbnail upload action in step 1 (Preview) and/or SEO step (alongside URL input).
- [ ] Define upload error/retry UX and validation (size/type) for author-facing media actions.

---

## Phase 3 — SEO and Discovery Hardening

### 1. Metadata consistency

- [x] Enforce consistent fallback strategy for title/description/OG/Twitter/canonical (`resolvePublicArticlePageMeta` for `/article/[slug]`).
- [x] Validate canonical URL format and domain policy (same origin as `NEXT_PUBLIC_SITE_URL` / `seoConfig.siteUrl`; API + SEO form).
- [x] Ensure private/link-only content cannot leak to indexable metadata (sitemap/RSS unchanged — public + `noindex` filter; private/preview `robots` unchanged).
- [ ] Article / site locale in metadata and markup (see **Phase 7**).
- [x] Keep canonical defaults derived from article URL while allowing explicit SEO-step override with validation (`articleCanonical.ts`).
- [x] Use one canonical generation/normalization utility for metadata, sitemap, RSS, IndexNow URL, and JSON-LD (`buildDefaultArticleUrl` / `resolveArticleCanonicalUrl`).

### 2. Structured data improvements

- [x] Expand article JSON-LD with optional fields (`keywords`, `isAccessibleForFree`; `articleSection` not yet in revision metadata).
- [x] Add schema validation checks in CI (JSON-LD shape sanity checks — `src/lib/seo/jsonld.test.ts`, run via `npm run test` / pre-push).

### 3. Search platform setup

- [ ] Complete Google Search Console setup (domain verification + sitemap submission).
- [ ] Complete Bing Webmaster setup (sitemap + IndexNow verification).
- [ ] Create SEO operations checklist for production incidents.

### 4. AI-assisted SEO authoring (optional module)

- [ ] Add AI suggestions for SEO fields (title, description, OG title/description) with explicit user confirmation.
- [ ] Add AI-assisted keyword suggestions based on article content.
- [ ] Add provider abstraction and feature flags (disabled by default for self-hosted/open-source baseline).
- [ ] Add audit trail for AI-generated drafts (what was suggested and what was accepted).

---

## Phase 4 — Performance and Runtime Monitoring

### 1. Core Web Vitals instrumentation

- [x] Implement `reportWebVitals` pipeline (App Router compatible — `web-vitals` + `WebVitalsReporter` in root layout).
- [x] Store RUM events (`LCP`, `INP`, `CLS`, `TTFB`, `FCP`) in Mongo (`RumWebVital`, TTL 14d, **client session sample** `NEXT_PUBLIC_RUM_SAMPLE_RATE` default 20%, server persists all received beacons, `COMMIT_HASH` on ingest only).
- [x] Admin RUM dashboard: `GET /api/v1/rum/dashboard` + `/admin/rum` — aggregate **p75**/avg/min/max per metric, total samples, top pathnames by volume (window 1–14d).
- [ ] Extend dashboards: **p75 by route** (per pathname or route group) and **by device / connection** segment (needs stable client fields + aggregation).
- [ ] Define target SLO thresholds per metric and route group for consistent alerting.

### 2. Alerting

- [ ] Add threshold-based alerting for metric degradation windows.
- [ ] Send alerts to Telegram with dedupe/cooldown logic.
- [ ] Add runbook links in alert payloads.

### 3. Frontend performance budget

- [ ] Track critical JS budget and keep under target.
- [ ] Reduce editor/admin payload impact on public pages.
- [x] Review image loading strategy (`sizes`, `srcset`, lazy boundaries).

### 4. Caching, CDN, and origin load

- [x] **Data cache (Next):** `unstable_cache` for public `/article/[slug]` payload (HTML body + revision metadata path); tag `public-article:{slug}`; `revalidateTag` from article and revision update routes.
- [ ] **Invalidation coverage:** any future mutation of published content (slug swap, revision switch, bulk jobs) must call the same tag/path revalidation — document or centralize in one service.
- [ ] **Multi-instance:** if self-hosted replicas do not share Next Data Cache, validate `revalidateTag` behavior or add external cache (Redis) for hot HTML.
- [ ] **Images / Uploadcare:** `/cdn/...` redirect to CDN — traffic still billed upstream; optional: stricter presets, `next/image`, or self-proxy only if egress economics justify it.
- [ ] **Optional Redis** for article JSON/HTML beyond Next cache if profiling shows DB+render still hot at scale.

---

## Phase 5 — Accessibility and Compliance

### 1. Accessibility baseline (WCAG 2.2 AA)

- [ ] Run full keyboard navigation audit on editor and public pages.
- [ ] Improve semantic structure and ARIA usage where needed.
- [ ] Add automated a11y checks (axe + lint rules in CI).
- [ ] Add manual accessibility QA checklist.
- [ ] Assign owner and audit cadence for recurring accessibility validation.

### 2. Privacy and consent

- [ ] Define GDPR/CCPA data collection policy for analytics and telemetry.
- [x] Implement cookie consent flow if non-essential tracking is enabled.
- [ ] Document data retention and user opt-out behavior.

---

## Phase 6 — Content Distribution and Growth

### 1. AI referral and citation tracking

- [ ] Add referrer classification for AI sources (Perplexity, ChatGPT, Copilot, Gemini, etc.).
- [ ] Build acquisition dashboard segment for AI-origin sessions.
- [ ] Track landing page performance from AI traffic.

### 2. Public article listing UX

- [x] Keep SSR first page for SEO.
- [x] Add client continuation pagination (“Load more” or infinite scroll) from SSR cursor.
- [x] Add filter/sort state persistence in URL.

### 3. Internationalization readiness

- [ ] Introduce key-based UI translations and local locale files for author/public pages.
- [ ] Add i18n conventions for content-related labels, validation messages, and notifications.
- [ ] Define migration plan for replacing hardcoded UI strings with translation keys.

---

## Phase 7 — Locale, content language, and user-facing language

**Goal:** one coherent story for **document `lang`**, **user/session locale**, **formatting (`Intl`)**, and **article content language** (SEO/a11y). Multilingual UI string catalogs stay aligned with **Phase 6 §3**; this phase focuses on locale negotiation and content-level language.

### 1. Site default and user locale

- [ ] Single source of truth for default locale (e.g. `NEXT_PUBLIC_DEFAULT_LOCALE` / `seoConfig`) driving root `<html lang>` and server-side `Intl` defaults.
- [ ] Optional: read `Accept-Language` in middleware + persist choice (cookie or user profile) for first-time visitors.
- [ ] Optional later: `app/[locale]` URL segment and redirects; document trade-offs (SEO, caching) before implementation.

### 2. Article content language (optional field; powers metadata + rendering)

- [ ] Optional field on revision or SEO step: **primary language of the article** (BCP 47, e.g. `ru`, `en-US`).
- [ ] Public (and preview/private) article markup: set `lang` on article wrapper when known; fallback to site default.
- [ ] Metadata + JSON-LD: `inLanguage`; dates/numbers use article locale when set, else site default.
- [ ] When/if translations exist: `hreflang` and locale-aware alternates (sitemap + `<head>`); until then, single-language sites can ship without alternates.

### 3. Consistency and docs

- [ ] Short doc: relationship between site locale, user preference, article language, and UI translations (Phase 6).

---

## Definition of Done (Cross-cutting)

For each roadmap item:

- [ ] Typecheck and lint pass.
- [ ] Unit/integration tests added or updated.
- [ ] Docs updated (`README` or `docs/`).
- [ ] Error handling and logs included.
- [ ] Backward compatibility considered.
- [ ] Owner and target review date assigned.

---

## Nice-to-Have (Later)

- [ ] Lighthouse CI quality gate (warn mode first, then fail mode).
- [ ] Advanced media management abstraction (Uploadcare adapter + provider interface).
- [x] Web Push + basic offline/cache support via service worker (`public/sw.js`).
- [ ] Offline-first strategy beyond push service worker.
