import { APP_INTERNAL_ORIGIN } from '@config/env'
import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import ArticleRevision from '@lib/db/models/ArticleRevision'
import { AxiosError } from 'axios'
import { headers } from 'next/headers'

import { ArticleFilter, ArticleModel, ArticleStatus, ArticleVisibility, ClientArticleApi, SortBy, SortOrder } from '~/api/article'
import { ArticleRevisionModel, ClientArticleRevisionApi } from '~/api/article-revision'
import { PaginationMeta } from '~/types'
import { Logger } from '~/utils/logger'

const logger = new Logger(['getServerArticle', '[lib/server-article.ts]'])

export async function getServerArticle(articleSlug: string, revisionId?: string): Promise<{ article: ArticleModel; revision: ArticleRevisionModel } | null> {
  try {
    const headersStore = await headers()
    const host = headersStore.get('host') || ''
    const protocol = headersStore.get('x-forwarded-proto') || 'http'
    const origin = `${protocol}://${host}`
    const apiOrigin = APP_INTERNAL_ORIGIN || origin
    const cookie = headersStore.get('cookie') || ''
    const api = new ClientArticleApi(apiOrigin, { headers: { Cookie: cookie } })
    const apiRevision = new ClientArticleRevisionApi(apiOrigin, { headers: { Cookie: cookie } })
    const article = await api.getArticleBySlug(articleSlug)

    if (!article) {
      return null
    }

    const articleRevision = await apiRevision.getArticleRevision(revisionId ?? article.revisionId ?? '')

    return { article, revision: articleRevision }
  } catch (error) {
    if (error instanceof AxiosError) {
      logger.error('getServerArticle', error.response?.data, error.response?.status)
    } else {
      logger.error('getServerArticle', error)
    }

    return null
  }
}

export async function getServerForPublicArticle(
  articleSlug: string,
  filter?: ArticleFilter,
): Promise<{ article: ArticleModel; revision: ArticleRevisionModel } | null> {
  try {
    await connectDB()
    const article = await Article.findOne({ slug: articleSlug, status: ArticleStatus.PUBLISHED, ...filter })

    if (!article) {
      return null
    }

    const articleRevision = await ArticleRevision.findById(article.revisionId)

    if (!articleRevision) {
      return null
    }

    return {
      article: { ...article.toObject(), id: article._id.toString(), revisionId: article.revisionId?.toString() ?? null },
      revision: { ...articleRevision.toObject(), id: articleRevision._id.toString(), articleId: articleRevision.articleId?.toString() ?? null },
    }
  } catch (error) {
    if (error instanceof AxiosError) {
      logger.error('getServerArticle', error.response?.data, error.response?.status)
    } else {
      logger.error('getServerArticle', error)
    }

    return null
  }
}

export async function getServerForPublicArticlesPaginated(
  filter: ArticleFilter,
): Promise<PaginationMeta<ArticleModel & { thumbnailUrl?: string | null; title?: string | null; description?: string | null }> | null> {
  try {
    await connectDB()
    const maxLimit = 10
    const articles = await Article.findListPaginated({
      sortBy: SortBy.publishedAt,
      sortOrder: SortOrder.desc,
      ...filter,
      status: ArticleStatus.PUBLISHED,
      visibility: ArticleVisibility.PUBLIC,
      limit: filter?.limit && filter.limit > maxLimit ? maxLimit : (filter.limit ?? maxLimit),
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
      })),
    }
  } catch (error) {
    if (error instanceof AxiosError) {
      logger.error('getServerArticle', error.response?.data, error.response?.status)
    } else {
      logger.error('getServerArticle', error)
    }

    return null
  }
}
