/** Injected into SEO suggest prompt — keep in sync with `parseSeoSuggestJson` in `src/api/llm/seo-suggest-parse.ts`. */

export const SEO_SUGGEST_JSON_INSTRUCTION = `
Return a single JSON object only (no markdown fences), with this exact shape. Use null for a field you cannot improve.
All string values must be plain text suitable for HTML meta / Open Graph (no markdown).

{
  "metaTitle": string | null,
  "metaDescription": string | null,
  "ogTitle": string | null,
  "ogDescription": string | null,
  "keywords": string | null
}

Rules:
- metaTitle: ~50–60 characters when possible; compelling for search.
- metaDescription: ~150–160 characters when possible.
- ogTitle / ogDescription: social-friendly; may match meta or be punchier.
- keywords: comma-separated or short list; optional, can be null.
- Match the article's primary language.
- Do not invent canonical URLs or image URLs.
`.trim()
