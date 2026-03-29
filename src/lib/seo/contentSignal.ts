/**
 * HTTP `Content-Signal` for public article pages (Content Signals framework; aligned with Cloudflare / agents guidance).
 * @see https://contentsignals.org/
 * @see https://blog.cloudflare.com/content-signals-policy/
 *
 * Only `ai-train` is controlled per article; `search` / `ai-input` stay permissive for public reader/agent surfaces (refine later with SEO noindex, etc.).
 */
export function buildPublicArticleContentSignalHeader(allowAiTraining: boolean): string {
  const train = allowAiTraining ? 'yes' : 'no'

  return `ai-train=${train}, search=yes, ai-input=yes`
}
