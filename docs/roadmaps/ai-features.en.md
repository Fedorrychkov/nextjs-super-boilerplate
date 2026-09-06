# AI Features Roadmap

Roadmap for LLM-assisted authoring, SEO tooling, and (later) media generation. **All OpenAI calls go through the backend** — API keys never ship to the client.

## Principles

- **Server-only secrets:** `LLM_API_KEY` and provider calls only on the server; `NEXT_PUBLIC_LLM_ENABLED` gates UI affordances.
- **Single provider (current scope):** OpenAI SDK / APIs only until a deliberate multi-provider abstraction is introduced.
- **Phased delivery:** ship vertical slices (API → persistence → UI) per phase; avoid blocking Phase 1 on image/audio infrastructure.
- **Post-processed assets:** Generated images and audio are uploaded to the existing **media pipeline** on the server; the client receives **final URLs** (and metadata), not raw blobs requiring a second upload.
- **Model choice:** Expose **per-mode** lists of allowed models from the API so the UI can show cost/quality trade-offs (chat, structured SEO, image, TTS).

---

## Phase 1 — Text AI (Chat-First) — *Current focus*

Goal: conversational assistance for **article body** and **SEO/preview settings**, with streaming responses, session scoping, and guardrails.

### Foundation (shipped)

- [x] **`LLMService`** (`lib/services/llm/llm.service.ts`): OpenAI client; `chat`, `chatStream`, `ask`, `generateText`, `listModels`; usage gated by `LLM_CONFIG` (no key on client).
- [x] **Config:** `LLM_CONFIG` in `config/env.ts` — `LLM_API_KEY`, `NEXT_PUBLIC_LLM_ENABLED` (strict: `=== 'true'`); entries in `.env.example`.

### 1.1 API and transport

- [x] **Streaming chat endpoint** — `POST /api/v1/llm/chat/stream` (SSE `text/event-stream`) using `llmService.chatStream` + `stream_options.include_usage`; no API key on client.
- [x] **Auth + authorization:** `ADMIN` / `EDITOR` only; `revisionId` must belong to `articleId` (`Article` + `ArticleRevision` loaded from DB).
- [x] **Rate limiting** — separate per-user limiter (`llmChatRateLimit`, key `llm:{userId}`); `LLM_CHAT_RATE_LIMIT_POINTS` / `LLM_CHAT_RATE_DURATION_SEC` in `LLM_CONFIG`.
- [x] **Configurable models** — `GET /api/v1/llm/models` returns `chat.models[]`; allowlist from `LLM_CHAT_MODELS` or defaults (`gpt-4o-mini`, `gpt-4o`).

### 1.2 Context and quality (“LLM validation”)

- [x] **Request payload builder** — `buildArticleChatSystemPrompt` + `extractPlainTextFromRevisionContent` (TipTap JSON → plain text, truncated) + title/description/SEO fields.
- [x] **System prompts (initial):** single system message instructs SEO + body help, language matching, and **no full-article analysis** when body is empty.
- [x] **Structured “quality” pass (optional sub-step):** `POST /api/v1/llm/article-audit` (JSON mode) + **Article audit** in `ArticleAiChatModal` (markdown view).

### 1.3 UI

- [x] **Chat surface** — `ArticleAiChatModal` from article editor; streamed assistant text.
- [x] **Gating:** UI only when `NEXT_PUBLIC_LLM_ENABLED === 'true'` **and** `articleId` + `revisionId` exist (no AI on brand-new article before save).
- [x] **Empty content:** short-body hint when extracted plain text is under ~40 characters.
- [x] **Structured apply (Phase 2, shipped):** SEO / Preview / Content tabs with generate + Apply — see Phase 2 below. *Optional polish:* Phase-1-style “copy snippet” shortcuts in chat only.

### 1.4 Persistence (minimal for Phase 1)

- [x] **Session/thread** tied to `articleId` + `revisionId` + user (`LlmChatSession` / `LlmChatMessage`); messages + **usage** on assistant turn; `GET /api/v1/llm/chat/history` + UI load on modal open.
- [x] **Persist article audits** — `LlmArticleAudit` collection: structured result + `llmModel`, **usage**, `createdAt`, `userId`, `articleId` + `revisionId`; append-only **history** per revision (newest first in API).
- [x] **Audit API + UI:** `GET /api/v1/llm/article-audit?articleId=&revisionId=` returns `{ items }`; `POST` saves after parse; modal loads **latest** audit for the revision on open (same as **«Аудит статьи»** re-run to append).
- [x] **Cross-feature usage log** — `LlmUsageEvent` append-only rows (`source`: `chat_stream` | `article_audit` | `seo_suggest` | `preview_suggest` | `content_suggest` | `listen_tts` | `image_generate` | `image_prompt_stream` | `image_prompt_article`), tokens, `userId`, optional `articleId` / `revisionId`) for **admin cost / usage** dashboards.
- [ ] **No requirement** to send full chat history on every LLM request; use **rolling summary + recent turns** (see Phase 2) — design tables with this in mind.

### 1.5 Observability

- [x] Log request id, model, duration, and token usage server-side (`Logger` on stream completion).
- [x] **Admin usage dashboard** — `GET /api/v1/llm/usage/dashboard?days=` (ADMIN only); UI `/admin/llm-usage`: totals, by source, top users, recent events from `LlmUsageEvent`.
- [x] **Per-revision usage in editor** — `GET /api/v1/llm/usage/article?articleId=&revisionId=` (current user); short summary next to the AI assistant button; invalidated after chat/audit from the modal.

**Phase 1 exit criteria:** Editor can open AI chat, stream replies, switch model from API-provided list, and context includes article + SEO where available; all calls go through backend. *(Structured SEO/Preview/Content apply is tracked under Phase 2 and is shipped.)*

---

## Phase 2 — Structured Apply, History, and Usage Board

- [x] **JSON / structured outputs** — `POST /api/v1/llm/seo/suggest`, `POST /api/v1/llm/preview/suggest`, `POST /api/v1/llm/content/suggest` (JSON mode): SEO meta/OG/**keywords**, preview title/description, and **full body Markdown**; **Apply** into SEO / preview / TipTap via refs (`ArticleEditableContent.applyMarkdown`). *Optional later:* TipTap JSON patch / partial diff instead of full replace. *(Aligns with product roadmap **Phase 3 §4** — AI-assisted SEO.)*
- [x] **Tab-aware modal:** `ArticleAiChatModal` shell tabs **Content** (chat + audits) | **SEO** | **Preview** with generate + structured preview + per-field / apply-all.
- [ ] **Audit timeline / compare (optional polish):** once audits are **persisted** (see Phase 1.4), UI to browse **multiple saved audits** per article or revision (e.g. timeline, diff of scores/summary) for **before/after** editing workflows.
- [ ] **Conversation compaction:** rolling summary + last N messages; optional “compact now” to refresh summary.
- [ ] **Usage analytics (Phase 2+):** charts, export, cost estimates per model — basic admin list is in Phase 1.5.
- [ ] **Prompt caching** where applicable (OpenAI) to reduce cost on repeated system prompts.

---

## Phase 3 — Image Generation (User Prompt → Media URL)

Goal: user enters a **prompt** (or derives one from the article); server generates an image via OpenAI **Image API** (`images.generate` with **`stream: true`** and `partial_images` on the server), uploads the result through the **media service**, returns **CDN URL** to the client.

**References:** [Image generation](https://developers.openai.com/api/docs/guides/image-generation) (GPT Image models, sizes, quality, streaming).

### 3.1 Backend

- [x] **Image generation** — `llmService.generateImageFromPromptStream` → OpenAI `client.images.generate` (stream, final `image_generation.completed` + usage).
- [x] **Model allowlist** — `LLM_IMAGE_MODELS` / `getImageModelAllowlist`; `GET /api/v1/llm/models` returns `image.models[]` with **per-model `aspectRatios`** (default **16:9**).
- [x] **Routes** — `POST /api/v1/llm/image/generate` (custom prompt or **from article** via one-shot chat + `image_prompt_article` usage); `POST /api/v1/llm/image/prompt/stream` (SSE suggest prompt → `image_prompt_stream`).
- [x] **Server-side upload** — `createMediaAssetFromBuffer`; response matches upload shape (`asset`, `proxyUrl`) + `promptUsed` / `usage`.
- [ ] **Moderation / org verification** awareness (GPT Image may require org verification — document ops steps).

### 3.2 UI

- [x] **Media library modal** — `MediaUrlUploadField`: AI block when `articleId` + `revisionId` + image field (Preview thumbnail, SEO OG image, TipTap **Image** dialog).
- [x] **Prompt suggest** — stream into textarea; **Generate** with model + aspect ratio.
- [x] **Partial preview in UI** — `POST /api/v1/llm/image/generate/stream` (SSE) forwards OpenAI `image_generation.partial_image` as `data:` events; client shows progressive `data:` URL preview until `done` (upload + asset).
- [ ] **Future:** **Image edit** with reference images (OpenAI edit/variation APIs) — new step after create-only flow is stable.

### 3.3 Product

- [ ] Clarify licensing/disclosure for AI-generated images in UI copy if required.

---

## Phase 4 — Text-to-Speech (Article Narration) — Media + Article Model

Goal: generate a **listenable** version of the article (“read by a narrator”) using OpenAI **Speech API**, store audio on the **article** (not revision), and expose optional generation at publish or from the **Content** tab.

**References:** [Text to speech](https://developers.openai.com/api/docs/guides/text-to-speech) (e.g. `gpt-4o-mini-tts`, voices, formats; streaming supported).

### 4.1 Content pipeline

- [x] **Plain-text extraction** for TTS — `extractPlainTextFromRevisionContent` (TipTap JSON → plain text) in `article-listen-audio.service`.
- [x] **Length limits** — OpenAI TTS cap (~4000 chars); **truncated single read** + UI warning when truncated; **chunking / concat** still optional.

### 4.2 Backend

- [x] **TTS generation** — `POST /api/v1/article/listen-audio/generate` (ADMIN/EDITOR); OpenAI Speech (`tts-1`, mp3) in `openai-speech.service.ts`; voice allowlist server-side.
- [ ] **Capabilities API** for TTS — expose **`availableVoices[]`** / models to the client (optional polish; voices are fixed allowlist today).
- [x] **Upload generated audio** via `createMediaAssetFromBuffer` → Uploadcare + `MediaAsset` (`AUDIO`).
- [x] **Persist on article:** `listenAudioAssetId`, `listenAudioSourceRevisionId`, `listenAudioGeneratedAt`; cache revalidate on generate.

### 4.3 UX

- [x] **Editor:** generate / regenerate listen audio (head revision only) + stale hint when text revision changed; `ClientArticleApi.generateListenAudio` + mutation.
- [x] **Public article page:** headphones control + `<audio>` via `/cdn/{assetId}` + **AI-generated voice** disclosure.
- [ ] **Publish flow (optional):** checkbox “Generate voice version after publish”.
- [x] **Disclosure** next to the public player (see copy in i18n).

### 4.5 Sync with on-page text (“karaoke”) — future

- [ ] **Word- or block-level highlight** during playback needs **time-aligned segments** (e.g. provider timestamps, forced alignment, or SSML/marked text + post-processing) — not shipped; rough progress-by-`currentTime` / duration is possible but inaccurate.

### 4.4 Integration with chat (optional)

- [ ] “Generate cover image” / “Generate narration” actions could later invoke Phase 3/4 from the same AI shell; still **server-only** and media-first.

---

## Phase 5 — Public content for AI agents (Markdown negotiation + Content Signals)

**Product alignment:** [**`docs/roadmaps/product.en.md`**](./product.en.md) Phase 6 §5 (Markdown for agents, `Content-Signal`, public-only surfaces).

**References:** Cloudflare [Introducing Markdown for Agents](https://blog.cloudflare.com/markdown-for-agents/), [Markdown for Agents (docs)](https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/), [Content Signals](https://contentsignals.org/), Cloudflare [Content Signals Policy](https://blog.cloudflare.com/content-signals-policy/).

### 5.1 Training / crawling policy (shipped — HTML)

- [x] **Per-article flag** `allowAiTraining` on **`Article`** (Mongo), default **`true`**; edited in editor **Preview** when visibility is **Public** (`ArticleEditablePreview`).
- [x] **HTTP `Content-Signal`** on public **`/article/[slug]`** HTML responses: `buildPublicArticleContentSignalHeader` in `src/lib/seo/contentSignal.ts`; **`src/proxy.ts`** fetches `GET /api/v1/public/article/content-signal?slug=` and sets the header (uses **`APP_INTERNAL_ORIGIN`** when needed).

### 5.2 Markdown representation (shipped)

- [x] **`Accept: text/markdown`** on **`/article/[slug]`** (**`src/proxy.ts`**: **`preferMarkdownAccept`** + rewrite to **`/api/v1/public/article/markdown`**); body = YAML front matter + TipTap → Markdown; **`Vary: Accept`** on HTML and Markdown; **`Content-Signal`** on Markdown responses (`src/app/api/v1/public/article/markdown/route.ts`).
- [x] **`x-markdown-tokens`** — `countPublicArticleMarkdownTokens` + **`gpt-tokenizer`** (default **o200k_base**) on the Markdown route.

---

## Cross-Cutting — Media and Models API

- [ ] **Unified “capabilities” or “models” endpoint** (or per-domain routes) returning for each mode: `chat`, `seo_structured`, `image`, `tts` — `{ models: [...], voices?: [...] }` with stable ids for UI.
- [x] **Media — audio:** upload via same `/api/v1/media` pipeline (`AUDIO` resource type), CDN URL, editor + public playback; MIME via `accept` + validation paths. *Quotas / formal ops doc still optional.*
- [x] **Env:** `NEXT_PUBLIC_LLM_ENABLED` and `LLM_API_KEY` documented in `.env.example`; strict opt-in for the public flag (`NEXT_PUBLIC_LLM_ENABLED === 'true'` in `config/env.ts`).

---

## Summary Table

| Phase | Focus | Client sees |
| ----- | ----- | ----------- |
| **1** | Text chat + streaming + SEO/article context + quality prompts; persisted audits + usage per revision | Streamed text; model list from API; article audits + `LlmUsageEvent` history |
| **2** | Structured apply, history, usage, compaction; audit timeline | Apply to forms/editor; dashboards; optional audit compare |
| **3** | Image generation → media URL | Image URL ready to insert |
| **4** | TTS → article audio field + optional publish hook | Audio URL; voice/model from API |
| **5** | Public agent-friendly delivery + Content Signals | `Content-Signal` + `Accept` Markdown on `/article/[slug]` |

---

## Out of Scope (for this document)

- Non-OpenAI providers (unless added later behind the same backend abstraction).
- Client-side direct calls to OpenAI.
- Storing full chat history in every LLM request without compaction (anti-pattern — use Phase 2 patterns instead).
