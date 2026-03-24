import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import ArticleRevision from '@lib/db/models/ArticleRevision'

import { ArticleFilter, ArticleStatus, ArticleVisibility, PublicArticleListItem, SortBy, SortOrder } from '~/api/article'
import { PaginationMeta } from '~/types'

/**
 * Published + public articles with revision title/description/thumbnail for listing cards.
 * Caller must not override `status` / `visibility`; they are forced here.
 */
export async function getPublicArticlesListEnriched(filter: ArticleFilter): Promise<PaginationMeta<PublicArticleListItem>> {
  await connectDB()

  const { status: _st, visibility: _vis, sortBy, sortOrder, ...rest } = filter

  const articles = await Article.findListPaginated({
    ...rest,
    sortBy: sortBy ?? SortBy.publishedAt,
    sortOrder: sortOrder ?? SortOrder.desc,
    status: ArticleStatus.PUBLISHED,
    visibility: ArticleVisibility.PUBLIC,
  })

  const revisionIds = Array.from(new Set(articles.list.map((item) => String(item.revisionId)).filter(Boolean)))

  const revisions = await ArticleRevision.find({ _id: { $in: revisionIds } })
    .select('thumbnailUrl title description')
    .lean()

  const revisionById = new Map(revisions.map((rev) => [String(rev._id), rev]))

  return {
    ...articles,
    list: articles.list.map((article) => ({
      ...article.toObject(),
      id: article._id.toString(),
      revisionId: article.revisionId?.toString() ?? null,
      title: revisionById.get(String(article.revisionId))?.title ?? null,
      description: revisionById.get(String(article.revisionId))?.description ?? null,
      thumbnailUrl: revisionById.get(String(article.revisionId))?.thumbnailUrl ?? null,
    })) as PublicArticleListItem[],
  }
}

export function emptyPublicArticlesList(): PaginationMeta<PublicArticleListItem> {
  return {
    currentPage: 1,
    pages: 0,
    list: [],
    count: 0,
  }
}
