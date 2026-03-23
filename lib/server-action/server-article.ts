import { APP_INTERNAL_ORIGIN } from '@config/env'
import { AxiosError } from 'axios'
import { headers } from 'next/headers'

import { ArticleModel, ClientArticleApi } from '~/api/article'
import { ArticleRevisionModel, ClientArticleRevisionApi } from '~/api/article-revision'
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
