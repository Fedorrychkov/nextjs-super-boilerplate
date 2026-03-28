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
- [ ] **“Apply” (Phase 1 minimal):** copy-paste or partial apply; full structured apply can be Phase 2.

### 1.4 Persistence (minimal for Phase 1)

- [x] **Session/thread** tied to `articleId` + `revisionId` + user (`LlmChatSession` / `LlmChatMessage`); messages + **usage** on assistant turn; `GET /api/v1/llm/chat/history` + UI load on modal open.
- [x] **Persist article audits** — `LlmArticleAudit` collection: structured result + `llmModel`, **usage**, `createdAt`, `userId`, `articleId` + `revisionId`; append-only **history** per revision (newest first in API).
- [x] **Audit API + UI:** `GET /api/v1/llm/article-audit?articleId=&revisionId=` returns `{ items }`; `POST` saves after parse; modal loads **latest** audit for the revision on open (same as **«Аудит статьи»** re-run to append).
- [x] **Cross-feature usage log** — `LlmUsageEvent` append-only rows (`source`: `chat_stream` | `article_audit`, tokens, `userId`, optional `articleId` / `revisionId`, links to session or audit) for future **admin cost / usage** dashboards.
- [ ] **No requirement** to send full chat history on every LLM request; use **rolling summary + recent turns** (see Phase 2) — design tables with this in mind.

### 1.5 Observability

- [x] Log request id, model, duration, and token usage server-side (`Logger` on stream completion).
- [x] **Admin usage dashboard** — `GET /api/v1/llm/usage/dashboard?days=` (ADMIN only); UI `/admin/llm-usage`: totals, by source, top users, recent events from `LlmUsageEvent`.
- [x] **Per-revision usage in editor** — `GET /api/v1/llm/usage/article?articleId=&revisionId=` (current user); short summary next to the AI assistant button; invalidated after chat/audit from the modal.

**Phase 1 exit criteria:** Editor can open AI chat, stream replies, switch model from API-provided list, and context includes article + SEO where available; all calls go through backend.

---

## Phase 2 — Structured Apply, History, and Usage Board

- [x] **JSON / structured outputs** — `POST /api/v1/llm/seo/suggest`, `POST /api/v1/llm/preview/suggest`, `POST /api/v1/llm/content/suggest` (JSON mode): SEO meta/OG, preview title/description, and **full body Markdown**; **Apply** into SEO / preview / TipTap via refs (`ArticleEditableContent.applyMarkdown`). *Optional later:* TipTap JSON patch / partial diff instead of full replace.
- [x] **Tab-aware modal:** `ArticleAiChatModal` shell tabs **Content** (chat + audits) | **SEO** | **Preview** with generate + structured preview + per-field / apply-all.
- [ ] **Audit timeline / compare (optional polish):** once audits are **persisted** (see Phase 1.4), UI to browse **multiple saved audits** per article or revision (e.g. timeline, diff of scores/summary) for **before/after** editing workflows.
- [ ] **Conversation compaction:** rolling summary + last N messages; optional “compact now” to refresh summary.
- [ ] **Usage analytics (Phase 2+):** charts, export, cost estimates per model — basic admin list is in Phase 1.5.
- [ ] **Prompt caching** where applicable (OpenAI) to reduce cost on repeated system prompts.

---

## Phase 3 — Image Generation (User Prompt → Media URL)

Goal: user enters a **prompt**; server generates an image via OpenAI **Image API** (e.g. `gpt-image-1-mini` or `gpt-image-1.5` per user choice), uploads the result through the **media service**, returns **CDN URL** to the client.

**References:** [Image generation](https://developers.openai.com/api/docs/guides/image-generation) (GPT Image models, sizes, quality, streaming partial images optional).

### 3.1 Backend

- [ ] **Image generation service** (OpenAI `images.generate` or Responses API with `image_generation` tool — pick one stack and standardize).
- [ ] **Model allowlist** per environment; API returns **`availableModels[]`** for image mode (e.g. `gpt-image-1-mini` vs `gpt-image-1.5`).
- [ ] **Server-side upload** to media pipeline; persist `MediaAsset` (or equivalent); response includes **public URL** and asset id.
- [ ] **Moderation / org verification** awareness (GPT Image may require org verification — document ops steps).

### 3.2 UI

- [ ] **Generate image** flow from editor or SEO (OG image) with prompt field + model dropdown + **Insert** into target field.
- [ ] Optional: streaming partial previews if enabled (`partial_images`) for better UX.

### 3.3 Product

- [ ] Clarify licensing/disclosure for AI-generated images in UI copy if required.

---

## Phase 4 — Text-to-Speech (Article Narration) — Media + Article Model

Goal: generate a **listenable** version of the article (“read by a narrator”) using OpenAI **Speech API**, store audio on the **article** (not revision), and expose optional generation at publish or from the **Content** tab.

**References:** [Text to speech](https://developers.openai.com/api/docs/guides/text-to-speech) (e.g. `gpt-4o-mini-tts`, voices, formats; streaming supported).

### 4.1 Content pipeline

- [ ] **Plain-text extraction** for TTS: strip Markdown/HTML/TipTap noise — one shared function used only for narration (avoid double-maintaining preview vs publish).
- [ ] **Length limits** and chunking strategy if input exceeds model limits (concatenate audio or single truncated read — product decision).

### 4.2 Backend

- [ ] **TTS endpoint** with `model`, `voice`, `format` (e.g. `mp3` or `wav` for latency); API returns **`availableVoices[]`** and **`availableModels[]`** for TTS mode.
- [ ] **Upload generated audio** via media pipeline; extend media layer to treat **audio** MIME types (Uploadcare or existing storage — **audio support** explicitly in schema and validation).
- [ ] **Persist on article model:** e.g. `audioAssetId` / `audioUrl` / duration (exact fields to be defined in schema migration).

### 4.3 UX

- [ ] **Content tab:** “Generate article audio” (primary entry for simplicity).
- [ ] **Publish flow (optional):** checkbox “Generate voice version after publish” (uses latest published revision’s text snapshot — define rules).
- [ ] **Disclosure:** OpenAI usage policy requires clear disclosure that voice is **AI-generated** — show in player UI.

### 4.4 Integration with chat (optional)

- [ ] “Generate cover image” / “Generate narration” actions could later invoke Phase 3/4 from the same AI shell; still **server-only** and media-first.

---

## Cross-Cutting — Media and Models API

- [ ] **Unified “capabilities” or “models” endpoint** (or per-domain routes) returning for each mode: `chat`, `seo_structured`, `image`, `tts` — `{ models: [...], voices?: [...] }` with stable ids for UI.
- [ ] **Media:** document and implement **audio** alongside images (upload, CDN URL, MIME checks, quotas).
- [x] **Env:** `NEXT_PUBLIC_LLM_ENABLED` and `LLM_API_KEY` documented in `.env.example`; strict opt-in for the public flag (`NEXT_PUBLIC_LLM_ENABLED === 'true'` in `config/env.ts`).

---

## Summary Table

| Phase | Focus | Client sees |
| ----- | ----- | ----------- |
| **1** | Text chat + streaming + SEO/article context + quality prompts; **planned:** persisted audits per revision | Streamed text; model list from API; audits comparable across edits (when persisted) |
| **2** | Structured apply, history, usage, compaction; audit timeline | Apply to forms/editor; dashboards; optional audit compare |
| **3** | Image generation → media URL | Image URL ready to insert |
| **4** | TTS → article audio field + optional publish hook | Audio URL; voice/model from API |

---

## Out of Scope (for this document)

- Non-OpenAI providers (unless added later behind the same backend abstraction).
- Client-side direct calls to OpenAI.
- Storing full chat history in every LLM request without compaction (anti-pattern — use Phase 2 patterns instead).
