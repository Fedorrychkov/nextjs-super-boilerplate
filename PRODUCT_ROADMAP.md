# Product Roadmap (Content Platform)

This roadmap tracks the remaining work for the article platform and related quality requirements.

## Current Baseline

- Multi-step article editor is implemented (`Preview -> Content -> SEO -> Publish`).
- Public article page has dynamic SEO metadata and JSON-LD.
- Preview page is `noindex/nofollow`.
- Sitemap and RSS now include published public articles from DB.
- Publish flow already triggers search engine notifications for indexable public articles.
- Media pipeline: Uploadcare via own API (`/api/v1/media`), `MediaAsset` in DB, proxy delivery (`/cdn/...`), editor paste/drop + Preview/SEO image fields, responsive `<picture>` / `srcset` on public article HTML; author upload **max size** aligned with `proxyClientMaxBodySize` (see `src/constants/media-upload.ts`), client checks + API **413** on oversize.
- Optional **LLM** authoring (chat, structured SEO/preview/content suggest, article audit, listen-audio TTS): server-only keys, `NEXT_PUBLIC_LLM_ENABLED`; detail in **`AI_FEATURES_ROADMAP.md`**.
- Public article HTML path: **`unstable_cache`** + **`revalidateTag`** on publish/revision update (`src/lib/cache/publicArticlePageCache.ts`). RUM (Phase 4) + optional analytics cookie consent.
- Planned / partial (Phase 6): **article view counters** + **`/admin/article-views`** (shipped); **reactions** (roadmap-only / likely deferred). **Public agents:** **`Accept: text/markdown`** on **`/article/[slug]`** (`src/proxy.ts` rewrite → Markdown + YAML front matter; **`Vary: Accept`**); **`Content-Signal`** and **`x-markdown-tokens`** on Markdown. See **`AI_FEATURES_ROADMAP.md`** Phase 5.

## Immediate Execution (Can Start Now)

- [ ] Add security test fixtures with common XSS payloads and run them in CI.
- [ ] Document canonical policy (`default from article URL + optional manual override in SEO step`).
- [x] Add canonical URL normalization utility (protocol/host/trailing slash rules).
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
- [x] Author-facing media upload **validation** (max file size, hints under upload UI, client block + API **413**); MIME narrowed via `accept`. Dedicated **retry** UX for failed uploads not finalized (generic mutation behavior only).

---

## Phase 3 — SEO and Discovery Hardening

### 1. Metadata consistency

- [x] Enforce consistent fallback strategy for title/description/OG/Twitter/canonical (`resolvePublicArticlePageMeta` for `/article/[slug]`).
- [x] Validate canonical URL format and domain policy (same origin as `NEXT_PUBLIC_SITE_URL` / `seoConfig.siteUrl`; API + SEO form).
- [x] Ensure private/link-only content cannot leak to indexable metadata (sitemap/RSS unchanged — public + `noindex` filter; private/preview `robots` unchanged).
- [x] Article / site locale in metadata and markup (see **Phase 7**).
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

Shipped as part of the LLM stack — see **`AI_FEATURES_ROADMAP.md`** (Phase 1–2: chat, structured suggest, modal tabs). **OpenAI-only** on the server; UI gated by `NEXT_PUBLIC_LLM_ENABLED`.

- [x] AI suggestions for SEO fields (meta title/description, OG title/description, **keywords**) with explicit user confirmation — `POST /api/v1/llm/seo/suggest`, **SEO** tab in `ArticleAiChatModal`, per-field / apply-all.
- [x] AI-assisted **keyword** suggestions from article content (same structured SEO response).
- [x] **Feature flags / opt-in** — `NEXT_PUBLIC_LLM_ENABLED`, server-only `LLM_API_KEY`; chat model allowlist via env (`LLM_CHAT_MODELS`, etc.).
- [ ] **Pluggable multi-provider** LLM abstraction (second vendor behind the same API) — still a single OpenAI-backed `LLMService` today.
- [x] **Usage / audit trail** — append-only `LlmUsageEvent` (tokens, source, user, article/revision where applicable); persisted **article quality** audits (`LlmArticleAudit`); chat history per revision. *Not stored:* fine-grained “accepted vs dismissed” per SEO field (optional future product depth).

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

- [x] Add referrer classification for AI sources (Perplexity, ChatGPT, Copilot, Gemini, etc.).
- [x] Build acquisition dashboard segment for AI-origin sessions.
- [x] Track landing page performance from AI traffic.
- [ ] Add prompt-based citation tracking (brand mention/citation share) across ChatGPT, Perplexity, Gemini, Copilot.
- [ ] Add AI citation KPIs: citation rate, share of voice, sentiment trend by prompt cluster.
- [ ] Add weekly export/report pipeline combining GSC + Bing Webmaster + AI citation dashboard.

### 2. Public article listing UX

- [x] Keep SSR first page for SEO.
- [x] Add client continuation pagination (“Load more” or infinite scroll) from SSR cursor.
- [x] Add filter/sort state persistence in URL.

### 3. Internationalization readiness

- [x] Introduce key-based UI translations and local locale files for author/public pages.
- [x] Add i18n conventions for content-related labels, validation messages, and notifications.
- [ ] Define migration plan for replacing hardcoded UI strings with translation keys.

### 4. Article views, reactions (optional), and analytics dashboards

**Goal:** measure **real reads** and (optionally) engagement, without counting **preview** or editor sessions. **Dashboards** should mirror the RUM pattern: **global board** + **drill-down by article** and **by revision** where data is revision-scoped.

#### Views — in scope (counter)

- [x] Persist **`viewCountTotal`** on **`Article`** and **`viewCount`** on **`ArticleRevision`**; increments from **`POST /api/v1/article/view`** (client **`ArticleViewTracker`** on **`/article/[slug]`** and **`/private-article/[slug]`** only — not preview/editor).
- [x] **Server-side** `recordArticleView` in **`lib/services/article-view.service.ts`**: validates **`surface`** `public` vs `private` vs article **visibility** (public / link_only / private + roles); optional JWT from cookie for private.
- [x] **Dedupe:** Redis **`SET … NX EX ~24h`** per `articleId + revisionId + (user id | visitorKey)` when **`REDIS_URL`** set; sessionStorage UUID for anonymous **`visitorKey`**.
- [x] **SSR vs cache:** counter not in cached HTML; **client POST** after mount.
- [x] **Admin list:** column **Views** (`viewCountTotal`); **dashboard** **`/admin/article-views`** + **`GET /api/v1/article/views/dashboard`** and per-article revisions **`GET /api/v1/article/views/by-article/[articleId]`**.

#### Reactions — roadmap only (likely deferred)

*Product decision: reactions are **probably not** shipping in the near term; keep requirements here for a possible later phase.*

- [ ] Define reaction types (e.g. 👍 / helpful / bookmark-style) and whether they are **anonymous** (browser/session key) vs **authenticated** only.
- [ ] Store aggregates per **article** and optionally per **published revision** if reactions should follow “which version was read”.
- [ ] Same **dashboard** surfaces as views: global summary + per-article + per-revision (when applicable).
- [ ] Rate limits and abuse controls (IP / session / user) consistent with view endpoint policy.

#### Dashboards (views + future reactions)

- [x] **Global dashboard** (admin): **`/admin/article-views`** — total views sum + table sorted by **`viewCountTotal`** (published articles).
- [x] **Per-article / per-revision:** expand row → revision table with **`viewCount`** per revision + article **`viewCountTotal`** (lifetime; not time-windowed yet).
- [ ] **Trends / time windows** (e.g. last 7 days) — not implemented.
- [ ] Document **best-effort** semantics under cache and load (product analytics, not billing-grade) — same caveat as in the unique-visitor design below.

#### Unique visitors (design options — pick one or combine)

| Approach | Pros | Cons |
| -------- | ---- | ---- |
| **Anonymous signed cookie** (`visitor_id` set on first `GET` via API) | Stable per browser profile, no login required for public | Cookie banner / consent if non-essential; cleared when user clears cookies |
| **`localStorage` UUID** + send with view API | No cookie; survives reloads in same origin | Lost on clear-site-data; not cross-device |
| **Authenticated user id** | Best for **private** articles (natural unique key) | Logged-out public traffic still needs anonymous key |
| **Redis / DB dedupe** (`articleId` + `visitorKey` + date bucket) | True “unique per day/week” without trusting client alone | Storage and TTL policy; `visitorKey` from cookie or hash |
| **IP + UA + day** (hashed, salted) | Rough uniques without cookies | GDPR/privacy review; VPN/shared IP collisions; less accurate |

**Recommendation:** for **public** articles use a **first-party anonymous id** (HttpOnly cookie or `localStorage` + header) created by `/api/v1/visitor` or set on first view POST; for **private** articles prefer **`userId`** from session as the dedupe key (optionally still merge with anonymous if you allow preview-style links later). Store **daily or weekly uniques** in a rollup table or Redis HyperLogLog if you need scale without storing every row.

- [ ] If **unique visitors** ship, surface them in the same **§4 dashboards** (global + per-article); view totals are already specified above.
- [ ] Document that metrics are **best-effort** under load and cache (acceptable for product analytics, not billing-grade).

### 5. Markdown for AI agents and “can AI learn / use this?” (public only)

**References:** Cloudflare [Introducing Markdown for Agents](https://blog.cloudflare.com/markdown-for-agents/) (why Markdown beats raw HTML for agents, token cost, `Accept: text/markdown`), [Markdown for Agents — Cloudflare Docs](https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/), [Content Signals](https://contentsignals.org/) / Cloudflare [Content Signals Policy](https://blog.cloudflare.com/content-signals-policy/).

**Scope:** **only public (and entitled crawlable) articles** — same visibility rules as today. Preview, drafts, private, and link-only **must not** return an alternate Markdown “agent feed” without proper auth, or should return **403/404**.

- [x] **Content negotiation** on the public article read path: `preferMarkdownAccept` in **`src/proxy.ts`**; when Markdown wins, **`NextResponse.rewrite`** to **`GET /api/v1/public/article/markdown?slug=`** (same URL in the browser: **`/article/[slug]`**).
- [x] **Markdown body:** TipTap JSON → Markdown via **`renderPublicArticleBodyMarkdown`** (`@tiptap/static-renderer/pm/markdown` + same **`defaultExtensions`** as HTML); **`buildPublicArticleMarkdownDocument`** adds YAML front matter (`title`, `description`, `slug`, `canonical`, `language`, `allow_ai_training`, ISO dates).
- [x] **Headers (Markdown responses):** `Content-Type: text/markdown; charset=utf-8`, **`Vary: Accept`**, **`Content-Signal`** — set in **`src/app/api/v1/public/article/markdown/route.ts`**; HTML responses also get **`Vary: Accept`** from **`src/proxy.ts`**.
- [x] **`x-markdown-tokens`** — token count for the full Markdown document via **`gpt-tokenizer`** (`countPublicArticleMarkdownTokens`, **o200k_base**); set on **`src/app/api/v1/public/article/markdown/route.ts`**.
- [x] **Publisher-controlled training flag** — per-article **`allowAiTraining`** (default **true**) in **Preview**; **`Content-Signal`** on HTML (**`src/proxy.ts`** + content-signal API) and on Markdown (markdown route). See **`AI_FEATURES_ROADMAP.md`** Phase 5.
- [x] **Caching:** payload cache (`getCachedPublicArticlePagePayload`) stores both **HTML and Markdown** bodies; responses send **`Vary: Accept`** so CDNs do not serve HTML to a Markdown `Accept` (and vice versa).
- [ ] **Operations note:** set **`APP_INTERNAL_ORIGIN`** in deploy so **`src/proxy.ts`** can resolve the internal API URL when `request.nextUrl.origin` is wrong (e.g. Docker). If the site uses **Cloudflare “Markdown for Agents”** at the edge, avoid conflicting double conversion — prefer **one** source of truth (origin-first Markdown vs edge HTML→MD).

---

## Phase 7 — Locale, content language, and user-facing language

**Goal:** one coherent story for **document `lang`**, **user/session locale**, **formatting (`Intl`)**, and **article content language** (SEO/a11y). Multilingual UI string catalogs stay aligned with **Phase 6 §3**; this phase focuses on locale negotiation and content-level language.

### 1. Site default and user locale

- [x] Single source of truth for default locale (e.g. `NEXT_PUBLIC_DEFAULT_LOCALE` / `seoConfig`) driving root `<html lang>` and server-side `Intl` defaults.
- [ ] Optional: read `Accept-Language` in middleware + persist choice (cookie or user profile) for first-time visitors.
- [ ] Optional later: `app/[locale]` URL segment and redirects; document trade-offs (SEO, caching) before implementation.

### 2. Article content language (optional field; powers metadata + rendering)

- [x] Optional field on revision or SEO step: **primary language of the article** (currently app locales `ru`/`en`).
- [x] Public (and preview/private) article markup: set `lang` on article wrapper when known; fallback to site default.
- [x] Metadata + JSON-LD: `inLanguage`; fallback to site default locale when article language is empty.
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
