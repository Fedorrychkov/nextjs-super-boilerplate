/** Injected into preview suggest prompt — keep in sync with `parsePreviewSuggestJson` in `src/api/llm/preview-suggest-parse.ts`. */

export const PREVIEW_SUGGEST_JSON_INSTRUCTION = `
Return a single JSON object only (no markdown fences), with this exact shape. Use null if you cannot improve.

{
  "title": string | null,
  "description": string | null,
  "rationale": string | null
}

Rules:
- title: article headline for listings and cards; concise; match article language.
- description: short preview / subtitle (~1–3 sentences, under ~200 characters when possible).
- rationale: optional one-line note for the editor (can be null).
- Do not change slug, visibility, or thumbnail — only title and description suggestions.
`.trim()
