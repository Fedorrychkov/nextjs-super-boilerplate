import { markdownToTiptapContent } from '../markdown'
import { errorResult, type McpToolDefinition, textResult } from '../registry'

type ArticleJson = {
  id: string
  slug?: string | null
  status?: string | null
  visibility?: string | null
  version?: number | null
  revisionId?: string | null
  publishedAt?: string | null
}

type RevisionJson = {
  id: string
  articleId: string | null
  title?: string | null
  status?: string | null
}

/**
 * Article tools. Default agent workflow (draft-first):
 * 1. `create_article_draft` → article + draft revision from Markdown
 * 2. `update_article_content` / `suggest_seo` → iterate
 * 3. human reviews at `/preview/<slug>?revisionId=…` (or agent calls `publish_article`
 *    when the token explicitly carries the `articles:publish` scope)
 */
export const articleTools: McpToolDefinition[] = [
  {
    name: 'list_articles',
    description:
      'List articles with pagination. Admin/editor tokens: full listing (any status incl. drafts, filterable). ' +
      'Other tokens get the reader view: published public articles only, enriched with title/description/thumbnail — ideal for digests. ' +
      'Requires scope articles:read.',
    scope: 'articles:read',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Page size (default 25)' },
        offset: { type: 'number', description: 'Items to skip' },
        status: { type: 'string', enum: ['draft', 'published', 'unpublished'], description: 'Filter by article status' },
      },
    },
    handler: async (args, ctx) => {
      const data = await ctx.api.get('/api/v1/article/list', {
        limit: typeof args.limit === 'number' ? args.limit : 25,
        offset: typeof args.offset === 'number' ? args.offset : 0,
        status: typeof args.status === 'string' ? args.status : undefined,
      })

      return textResult(data)
    },
  },
  {
    name: 'get_article',
    description:
      'Get a single article by id or slug (one of them is required). Non-staff tokens can fetch by slug only published articles; ' +
      'fetching by id and drafts require an admin/editor token. Requires scope articles:read.',
    scope: 'articles:read',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Article id' },
        slug: { type: 'string', description: 'Article slug' },
      },
    },
    handler: async (args, ctx) => {
      if (typeof args.id === 'string' && args.id) {
        return textResult(await ctx.api.get(`/api/v1/article/get/${encodeURIComponent(args.id)}`))
      }

      if (typeof args.slug === 'string' && args.slug) {
        return textResult(await ctx.api.get(`/api/v1/article/get-by-slug/${encodeURIComponent(args.slug)}`))
      }

      return errorResult('Provide either "id" or "slug".')
    },
  },
  {
    name: 'get_article_revision',
    description:
      'Get a single article revision by id (title, content, status, SEO metadata). Non-staff tokens can only read the current revision ' +
      'of a published article (drafts and history are staff-only). Requires scope articles:read.',
    scope: 'articles:read',
    inputSchema: {
      type: 'object',
      properties: {
        revisionId: { type: 'string', description: 'ArticleRevision id' },
      },
      required: ['revisionId'],
    },
    handler: async (args, ctx) => {
      return textResult(await ctx.api.get(`/api/v1/article-revision/get/${encodeURIComponent(String(args.revisionId))}`))
    },
  },
  {
    name: 'create_article_draft',
    description:
      'Create a new article as a DRAFT: creates the article and its first revision from Markdown. Returns articleId, revisionId and a preview URL for human review. Publication is a separate step (publish_article, scope articles:publish). Requires scope articles:write.',
    scope: 'articles:write',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'URL slug, e.g. "my-article"' },
        title: { type: 'string', description: 'Article title' },
        markdown: { type: 'string', description: 'Article body in Markdown (images: ![alt](url))' },
        description: { type: 'string', description: 'Short description / lead' },
        visibility: { type: 'string', enum: ['public', 'private'], description: 'Default: public' },
        language: { type: 'string', description: 'Content language code, e.g. "en" or "ru" (stored in SEO metadata)' },
        seoDescription: { type: 'string', description: 'Meta description for SEO' },
        seoKeywords: { type: 'string', description: 'Comma-separated SEO keywords' },
        thumbnailUrl: { type: 'string', description: 'Thumbnail image URL (optional)' },
      },
      required: ['slug', 'title', 'markdown'],
    },
    handler: async (args, ctx) => {
      const article = await ctx.api.post<ArticleJson>('/api/v1/article/create', {
        slug: String(args.slug),
        visibility: typeof args.visibility === 'string' ? args.visibility : 'public',
        allowAiTraining: true,
      })

      const seo: Record<string, unknown> = {}

      if (typeof args.seoDescription === 'string' && args.seoDescription) {
        seo.description = args.seoDescription
      }

      if (typeof args.seoKeywords === 'string' && args.seoKeywords) {
        seo.keywords = args.seoKeywords
      }

      if (typeof args.language === 'string' && args.language) {
        seo.language = args.language
      }

      const revision = await ctx.api.post<RevisionJson>('/api/v1/article-revision/create', {
        articleId: article.id,
        title: String(args.title),
        description: typeof args.description === 'string' ? args.description : undefined,
        thumbnailUrl: typeof args.thumbnailUrl === 'string' ? args.thumbnailUrl : undefined,
        content: markdownToTiptapContent(String(args.markdown)),
        metadata: { seo },
      })

      return textResult({
        articleId: article.id,
        revisionId: revision.id,
        slug: article.slug,
        status: 'draft',
        previewUrl: `${ctx.baseUrl}/preview/${article.slug}?revisionId=${revision.id}`,
        next: 'A human can review the draft at previewUrl. Use publish_article to publish (requires articles:publish scope).',
      })
    },
  },
  {
    name: 'update_article_content',
    description:
      'Update a draft revision: body (Markdown), title, description and/or SEO metadata. Does NOT change publication status. Requires scope articles:write.',
    scope: 'articles:write',
    inputSchema: {
      type: 'object',
      properties: {
        revisionId: { type: 'string', description: 'ArticleRevision id to update' },
        markdown: { type: 'string', description: 'New article body in Markdown (replaces current content)' },
        title: { type: 'string' },
        description: { type: 'string' },
        seoDescription: { type: 'string' },
        seoKeywords: { type: 'string' },
        language: { type: 'string' },
      },
      required: ['revisionId'],
    },
    handler: async (args, ctx) => {
      const body: Record<string, unknown> = { id: String(args.revisionId) }

      if (typeof args.markdown === 'string' && args.markdown) {
        body.content = markdownToTiptapContent(args.markdown)
      }

      if (typeof args.title === 'string') {
        body.title = args.title
      }

      if (typeof args.description === 'string') {
        body.description = args.description
      }

      const seo: Record<string, unknown> = {}

      if (typeof args.seoDescription === 'string') {
        seo.description = args.seoDescription
      }

      if (typeof args.seoKeywords === 'string') {
        seo.keywords = args.seoKeywords
      }

      if (typeof args.language === 'string' && args.language) {
        seo.language = args.language
      }

      if (Object.keys(seo).length) {
        body.metadata = { seo }
      }

      const data = await ctx.api.put<RevisionJson>('/api/v1/article-revision/update', body)

      return textResult({ revisionId: data.id, articleId: data.articleId, status: data.status })
    },
  },
  {
    name: 'suggest_seo',
    description:
      'Ask the app LLM for SEO suggestions (title/description/keywords) for an article revision. Requires scope articles:seo and NEXT_PUBLIC_LLM_ENABLED on the server.',
    scope: 'articles:seo',
    inputSchema: {
      type: 'object',
      properties: {
        articleId: { type: 'string' },
        revisionId: { type: 'string' },
      },
      required: ['articleId', 'revisionId'],
    },
    handler: async (args, ctx) => {
      const data = await ctx.api.post('/api/v1/llm/seo/suggest', {
        articleId: String(args.articleId),
        revisionId: String(args.revisionId),
      })

      return textResult(data)
    },
  },
  {
    name: 'publish_article',
    description:
      'Publish an article: points the article to the given revision, sets status=published and confirms the revision (triggers cache revalidation + IndexNow). Requires scope articles:publish — without it the API returns 403 and a human should publish from the admin UI instead.',
    scope: 'articles:publish',
    inputSchema: {
      type: 'object',
      properties: {
        articleId: { type: 'string' },
        revisionId: { type: 'string', description: 'Revision to publish' },
      },
      required: ['articleId', 'revisionId'],
    },
    handler: async (args, ctx) => {
      const articleId = String(args.articleId)
      const revisionId = String(args.revisionId)

      const article = await ctx.api.get<ArticleJson>(`/api/v1/article/get/${encodeURIComponent(articleId)}`)

      // Confirm the revision FIRST: if the article update below fails, the public site stays untouched
      // (a confirmed revision on a draft article is harmless; the reverse — a published article pointing
      // at an unconfirmed revision — is not). The server sets publishedAt on confirm.
      const revision = await ctx.api.put<RevisionJson>('/api/v1/article-revision/update', {
        id: revisionId,
        status: 'confirmed',
      })

      try {
        await ctx.api.put<ArticleJson>('/api/v1/article/update', {
          id: articleId,
          revisionId,
          status: 'published',
          version: (article.version ?? 0) + 1,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown error'

        return errorResult(
          `Revision ${revisionId} is confirmed, but publishing the article failed: ${message}. ` +
            'The article is NOT published. It is safe to call publish_article again to retry.',
        )
      }

      return textResult({
        articleId,
        revisionId: revision.id,
        status: 'published',
        publicUrl: article.slug ? `${ctx.baseUrl}/article/${article.slug}` : null,
      })
    },
  },
  {
    name: 'unpublish_article',
    description: 'Unpublish an article (status=unpublished, removed from public site). Requires scope articles:publish.',
    scope: 'articles:publish',
    inputSchema: {
      type: 'object',
      properties: {
        articleId: { type: 'string' },
      },
      required: ['articleId'],
    },
    handler: async (args, ctx) => {
      const data = await ctx.api.put<ArticleJson>('/api/v1/article/update', {
        id: String(args.articleId),
        status: 'unpublished',
      })

      return textResult({ articleId: data.id, status: data.status })
    },
  },
  {
    name: 'get_article_views',
    description: 'Get view statistics for an article. Requires scope articles:read.',
    scope: 'articles:read',
    inputSchema: {
      type: 'object',
      properties: {
        articleId: { type: 'string' },
      },
      required: ['articleId'],
    },
    handler: async (args, ctx) => {
      return textResult(await ctx.api.get(`/api/v1/article/views/by-article/${encodeURIComponent(String(args.articleId))}`))
    },
  },
]
