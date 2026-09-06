# Improvements Roadmap (GEO, Discoverability, Marketing Surface)

This roadmap tracks **non-feature** improvements: **GEO** (Generative Engine Optimization / discoverability for LLM agents and tools), homepage quality, and related technical SEO signals. It complements [**`docs/roadmaps/product.en.md`**](./product.en.md) (product) and [**`docs/roadmaps/ai-features.en.md`**](./ai-features.en.md) (LLM authoring). **Public articles** already expose Markdown via `Accept`, `Content-Signal`, and YAML front matter — this file focuses on the **landing** and **global** signals.

## Principles

- **One canonical site URL** — no separate “bot-only” origin; agent-friendly content is negotiated where already implemented (`/article/[slug]`, see `src/proxy.ts`).
- **Explicit machine-readable hints** — `llms.txt` and aligned metadata so crawlers and audits can find primary docs and policy without scraping the whole UI.
- **Semantic HTML + sufficient copy** — thin homepages score poorly in automated audits and give agents little structured text to quote.
- **Honest scope** — GEO does not guarantee citations in chatbots; it improves **clarity, crawlability, and consistency** of what you publish.

### Industry GEO alignment (synthesized from common guides)

Third-party guides (e.g. [AIOSEO — Generative Engine Optimization](https://aioseo.com/generative-engine-optimization-geo/)) stress that GEO **extends** classic SEO: AI-oriented surfaces favor **intent**, **semantic coverage**, and **trust signals**, not keyword density alone.

- **Search intent** — copy should answer *why* someone arrived (problem/solution), including natural and long-tail phrasing; align visible headings with that intent.
- **E-E-A-T** (Experience, Expertise, Authoritativeness, Trustworthiness) — surface **who** maintains the project (org, authors, links to GitHub/docs), and **transparent** policies where relevant; helps both human trust and machine-extractable “entity” context.
- **Structure** — short paragraphs, descriptive **`h2` / `h3`**, lists and tables where they clarify meaning (easier for humans and parsers than walls of text).
- **Authority in long-form** — in articles/docs, support claims with **citations**, links to reputable sources, and data where appropriate (thin marketing pages alone rarely suffice).
- **Multimedia** — images/videos/diagrams can increase engagement and context; they **complement** but do not replace substantive text.
- **Measurement** — track Search Console (impressions, queries, decaying pages) alongside automated audits; GEO is not a single score.

## Baseline (already in repo)

- Root metadata and OG/Twitter from `src/app/layout.tsx` + [`src/lib/seo/config.ts`](../../src/lib/seo/config.ts).
- Homepage: [`src/app/page.tsx`](../../src/app/page.tsx) — hero + links + latest articles; `Organization` / `WebSite` JSON-LD via [`src/lib/seo/jsonld`](../../src/lib/seo/jsonld.tsx).
- Article-side agent story is documented in drafts and **`docs/roadmaps/ai-features.en.md`** Phase 5 (Markdown negotiation, tokens header).

---

## Phase 1 — Quick wins (audit-aligned)

Goal: fix common automated checks (`llms.txt` missing, generic meta, homepage not differentiated).

- [x] **`public/llms.txt`** — short project summary, links to GitHub, key docs (`docs/…`), sitemap URL; follow [llmstxt.org](https://llmstxt.org/) conventions.
- [x] **Homepage-specific metadata** — `export async function generateMetadata` for [`src/app/page.tsx`](../../src/app/page.tsx) (or a route `layout.tsx`) so `title` / `description` / OG match the hero and target phrases (without duplicating the entire `seoConfig` for other routes).
- [ ] **Tighten or specialize `seoConfig`** — optional: richer `defaultDescription` / `defaultTitle` in [`src/lib/seo/config.ts`](../../src/lib/seo/config.ts) *or* keep globals minimal and rely on per-route metadata for `/` only. *(Globals unchanged; `/` uses `home.metaTitle` / `home.metaDescription` + shared `BOILERPLATE_*` URLs.)*
- [x] **Ensure `llms.txt` is linked or discoverable** — **chosen URL:** **`/llms.txt`** (static file under `public/`). Linked from the homepage “For developers and agents” section. *(Optional later: redirect `/.well-known/llms.txt` → `/llms.txt` at the edge if a tool requires it.)*

---

## Phase 2 — Homepage content & semantics (GEO-friendly)

Goal: reduce “thin content” warnings and give agents clear sections to index.

- [x] **Structured sections** — e.g. `<section>` + `<h2>` blocks (features, stack, docs links) on the home route; keep i18n via `getServerT` / message keys.
- [x] **Target copy length** — aim for **~300–500+ words** of meaningful text (or a dedicated `/about` / `/docs` page linked prominently from home). *(Covered on `/` via new `home.*` strings; optional `/about` still possible.)*
- [x] **Align phrases with metadata** — important keywords should appear in `<title>`, meta description, and at least one visible heading (audits flag mismatches).
- [x] **Optional: “For developers & agents” block** — short bullet list pointing to Markdown-on-article behavior, `llms.txt`, and GitHub (educates humans and improves extractable text).
- [x] **Intent-aligned copy** — hero/sections explicitly state *what* the boilerplate is for (stack, deployment story, docs entry) using conversational, query-shaped phrasing where natural (see **Industry GEO alignment** above).
- [x] **E-E-A-T on the surface** — visible link to maintainers/repo, short “About this project” or org line (can point to `/about` or README); optional author/org block if multiple contributors matter for brand.
- [x] **Topic clusters from home** — prominent links to **pillar** content (articles, guides) so crawlers and users see depth beyond the hero (related to “cornerstone” / hub patterns in GEO literature).

---

## Phase 3 — Structured data & social proof

Goal: stronger machine-readable identity and sharing signals.

- [x] **`SoftwareApplication` or `WebApplication` JSON-LD** on the homepage (name, description, `url`, `installUrl`/`sameAs` → GitHub — `schema-dts` typings omit `codeRepository` on `SoftwareApplication`) — extend [`src/lib/seo/jsonld`](../../src/lib/seo/jsonld.tsx) or colocate a small builder next to existing helpers.
- [ ] **Social links in footer or layout** — consistent `sameAs` alignment with [`NEXT_PUBLIC_ORGANIZATION_SAME_AS`](../../config/env.ts) / `seoConfig.organizationSameAs` (improves “entity” signals; many audits score social presence).
- [ ] **Optional:** dedicated **LinkedIn / YouTube** (or primary channel) links if they exist — audits often flag missing profiles.

---

## Phase 3b — Long-form & editorial (articles / docs)

Applies to published articles and documentation pages, not only the homepage.

- [ ] **Citations and outbound authority** — where claims are factual, link to **primary** or widely accepted sources (docs, standards, RFCs).
- [ ] **Refresh stale pillars** — periodically update high-traffic pages (“content decay” monitoring via Search Console or analytics).

---

## Phase 4 — Performance & infra (indirect GEO/SEO)

These items often appear in generic site audits; they support crawl budget and trust, not LLM ranking directly.

- [ ] **Reduce client JS weight on first paint** where possible (reports cite large JS vs HTML — prioritize content-visible SSR for hero).
- [ ] **Avoid unnecessary redirects** — audit “multiple redirects” hints (CDN / www / trailing slash policy).
- [ ] **Email authentication (domain)** — **SPF** / **DMARC** (and related) for the mail-sending domain; tracked at domain/DNS level — see [**`docs/deploy/infrastructure-backlog.ru.md`**](../deploy/infrastructure-backlog.ru.md) / [**`docs/deploy/infrastructure-plan.en.md`**](../deploy/infrastructure-plan.en.md) if applicable.

---

## Phase 5 — Policy & bots (optional, product decision)

- [ ] **Document crawler stance** — whether/how to mention AI crawlers in `robots.txt` (allow/deny `GPTBot`, `OAI-SearchBot`, etc.) — legal/product choice, not only engineering.
- [ ] **Cross-link privacy / terms** from `llms.txt` if user data or training policy must be stated explicitly.

---

## Exit criteria (lightweight)

- **Phase 1:** `llms.txt` returns 200; homepage has distinct `title` / `description` in HTML for `/`.
- **Phase 2:** Lighthouse/content audits no longer flag severe “thin content” for `/` (subjective — re-run the same tool).
- **Phase 3:** Rich results / schema validators pass for the chosen JSON-LD type.
- **Phase 4–5:** Tracked as needed per deploy environment.

---

## References

- [llmstxt.org](https://llmstxt.org/) — `llms.txt` format.
- [Content Signals](https://contentsignals.org/) — already used for public article responses (`Content-Signal` header).
- [AIOSEO — The Beginner’s Guide to Generative Engine Optimization (GEO)](https://aioseo.com/generative-engine-optimization-geo/) — intent vs keywords, E-E-A-T, structure, technical GEO, measurement (WordPress-oriented; principles transfer).
- Internal: the article-side feature narrative (articles + Markdown) lived in a draft that was removed; see the published article linked from the root `README.md`.
