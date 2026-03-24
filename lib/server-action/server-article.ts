import { APP_INTERNAL_ORIGIN } from '@config/env'
import { shouldSkipDbDuringBuild } from '@lib/build-phase'
import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import ArticleRevision from '@lib/db/models/ArticleRevision'
import { emptyPublicArticlesList, getPublicArticlesListEnriched } from '@lib/services/public-articles-list.service'
import { AxiosError } from 'axios'
import { headers } from 'next/headers'

import { ArticleFilter, ArticleModel, ArticleStatus, ClientArticleApi } from '~/api/article'
import type { PublicArticleListItem } from '~/api/article/publicListQuery'
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
    if (shouldSkipDbDuringBuild()) {
      return null
    }

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

export async function getServerForPublicArticlesPaginated(filter: ArticleFilter): Promise<PaginationMeta<PublicArticleListItem> | null> {
  try {
    if (shouldSkipDbDuringBuild()) {
      return emptyPublicArticlesList()
    }

    return await getPublicArticlesListEnriched(filter)
  } catch (error) {
    if (error instanceof AxiosError) {
      logger.error('getServerArticle', error.response?.data, error.response?.status)
    } else {
      logger.error('getServerArticle', error)
    }

    return null
  }
}
