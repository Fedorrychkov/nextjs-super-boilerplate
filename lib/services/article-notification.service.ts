import { deliverEventNotification } from '@lib/services/notification-events.service'

import { PlatformNotificationType } from '~/api/notification'
import type { TFunction } from '~/lib/i18n'

function resolveArticleAdminUrlPath(articleId: string): string {
  return `/admin/articles/${articleId}`
}

export async function notifyArticlePublished(params: { recipientUserId: string; articleId: string; articleTitle: string; t: TFunction }): Promise<void> {
  await deliverEventNotification({
    eventId: 'article',
    recipientUserId: params.recipientUserId,
    type: PlatformNotificationType.ARTICLE_PUBLISHED,
    title: params.t('platformNotifications.triggers.articlePublished.title'),
    body: params.t('platformNotifications.triggers.articlePublished.body', { title: params.articleTitle }),
    urlPath: resolveArticleAdminUrlPath(params.articleId),
    source: 'article_publish',
    t: params.t,
  })
}

export async function notifyArticleUpdated(params: { recipientUserId: string; articleId: string; articleTitle: string; t: TFunction }): Promise<void> {
  await deliverEventNotification({
    eventId: 'article',
    recipientUserId: params.recipientUserId,
    type: PlatformNotificationType.ARTICLE_UPDATED,
    title: params.t('platformNotifications.triggers.articleUpdated.title'),
    body: params.t('platformNotifications.triggers.articleUpdated.body', { title: params.articleTitle }),
    urlPath: resolveArticleAdminUrlPath(params.articleId),
    source: 'article_update',
    t: params.t,
  })
}

export async function notifyArticlePublishedFromRevision(params: {
  recipientUserId: string
  articleId: string
  revisionTitle?: string | null
  t: TFunction
}): Promise<void> {
  const articleTitle = params.revisionTitle?.trim() || params.t('platformNotifications.triggers.articlePublished.fallbackTitle')

  await notifyArticlePublished({
    recipientUserId: params.recipientUserId,
    articleId: params.articleId,
    articleTitle,
    t: params.t,
  })
}
