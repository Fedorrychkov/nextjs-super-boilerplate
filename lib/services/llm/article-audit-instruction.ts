/** Injected into audit system prompt — keep in sync with `parseArticleAuditJson` in `~/api/llm/article-audit-parse`. */
export const ARTICLE_AUDIT_JSON_INSTRUCTION = `Return one JSON object with exactly this shape (all string arrays may be empty):
{
  "preview": {
    "score": <integer 0-100 optional, overall strength of title/description/thumbnail/slug/visibility>,
    "summary": <string, 1-3 sentences>,
    "strengths": [<string>, ...],
    "issues": [<string>, ...],
    "recommendations": [<string>, ...]
  },
  "content": {
    "score": <integer 0-100 optional>,
    "summary": <string>,
    "strengths": [<string>, ...],
    "issues": [<string>, ...],
    "recommendations": [<string>, ...]
  },
  "seo": {
    "score": <integer 0-100 optional>,
    "summary": <string>,
    "strengths": [<string>, ...],
    "issues": [<string>, ...],
    "recommendations": [<string>, ...]
  },
  "overall": <string, optional: one short paragraph tying the three areas together>
}`
