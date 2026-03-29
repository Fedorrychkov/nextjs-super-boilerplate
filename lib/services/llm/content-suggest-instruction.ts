/* eslint-disable max-len */
/** Injected into content suggest prompt — keep in sync with `parseContentSuggestJson` in `src/api/llm/content-suggest-parse.ts`. */

export const CONTENT_SUGGEST_JSON_INSTRUCTION = `
Return a single JSON object only (no markdown fences), with this exact shape:

{
  "markdown": string,
  "rationale": string | null
}

Rules:
- "markdown": the **full** revised article body as GitHub-Flavored Markdown (headings, lists, links, bold/italic, fenced code blocks where useful). This will replace the entire editor document.
- Match the article's primary language.
- Preserve factual meaning; improve structure, clarity, and flow. If the source text is empty or very short, write a helpful draft the author can edit.
- "rationale": optional short note for the editor (can be null).
- Do not include front matter YAML unless the article already uses it.
`.trim()
