/**
 * After `NextResponse.rewrite` from `/article/[slug]`, route handlers may still see the
 * original pathname with no query string. Proxy sets this header from the trusted path segment.
 */
export const ARTICLE_MARKDOWN_REWRITE_SLUG_HEADER = 'x-next-public-article-slug'
