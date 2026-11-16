import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import ArticleRevision from '@lib/db/models/ArticleRevision'
import User from '@lib/db/models/User'
import { notifyArticlePublishedFromRevision } from '@lib/services/article-notification.service'
import { forgetArticleMisses } from '@lib/services/article-page-miss'

import { ArticleStatus } from '~/api/article'
import { ArticleRevisionSeoMetadata, ArticleRevisionStatus } from '~/api/article-revision'
import { coerceLocale, getDefaultLocale } from '~/lib/i18n/config'
import { getT } from '~/lib/i18n/getT'
import { resolveIndexingUrlsForArticleTransition } from '~/lib/seo/articleIndexingNotify'
import { collectSlugsForTranslationGroups } from '~/lib/seo/articleTranslationAlternates'
import { notifySearchEngines } from '~/lib/seo/indexing'
import { Logger } from '~/utils/logger'

const logger = new Logger(['article-schedule', '[lib/services/article-schedule.service.ts]'])

/** Most articles published per tick: a scheduled batch for one minute is a handful, not hundreds. */
const BATCH = 20

const seoOf = (metadata: unknown) => (metadata as { seo?: ArticleRevisionSeoMetadata | null } | undefined)?.seo ?? null

/**
 * Scheduled publishing, run by the worker job `articles-scheduled` once a minute. The worker is its
 * own process without Next's cache, so it cannot call `revalidateTag`: the page cache keeps only
 * hits, and a remembered miss lives in the shared cache, which this clears after publishing.
 * Sitemap and RSS catch up on their own `s-maxage`.
 */
export const articleScheduleService = {
  async publishDue(now: Date = new Date()): Promise<{ published: number }> {
    await connectDB()

    // An article can be published by hand around `article/update` (the translation-group batch
    // buttons) — then its schedule is just dropped, or the admin would keep showing "goes live …".
    await Article.updateMany({ status: ArticleStatus.PUBLISHED, scheduledAt: { $ne: null } }, { $set: { scheduledAt: null, scheduledBy: null } })

    const due = Article.find({ status: { $ne: ArticleStatus.PUBLISHED }, scheduledAt: { $ne: null, $lte: now }, revisionId: { $ne: null } })
      .sort({ scheduledAt: 1 })
      .cursor()

    let published = 0

    for await (const article of due) {
      // Broken entries below `continue` without counting: they must not use up the batch.
      if (published >= BATCH) break

      const revision = await ArticleRevision.findOne({ _id: article.revisionId, articleId: article._id })

      if (!revision) {
        logger.warn('scheduled article has no revision of its own — skipped', article._id.toString())
        continue
      }

      // Confirm before the claim, so a failed revision write leaves the article queued for retry.
      const confirmedHere = revision.status !== ArticleRevisionStatus.CONFIRMED

      if (confirmedHere) await revision.updateOne({ $set: { status: ArticleRevisionStatus.CONFIRMED } })

      // Claimed by the old status, time, revision and `updatedAt`: a manual publish, an edit, a
      // reschedule or another worker in between makes it miss — no second publication.
      const claimed = await Article.findOneAndUpdate(
        { _id: article._id, status: article.status, scheduledAt: article.scheduledAt, revisionId: article.revisionId, updatedAt: article.updatedAt },
        {
          $set: {
            status: ArticleStatus.PUBLISHED,
            publishedAt: article.publishedAt ?? article.scheduledAt,
            scheduledAt: null,
            scheduledBy: null,
            updatedAt: now,
          },
          $inc: { version: 1 },
        },
        { returnDocument: 'after' },
      )

      if (!claimed) {
        // Someone else changed the article; the revision we confirmed may not be what goes live.
        if (confirmedHere) {
          await ArticleRevision.updateOne({ _id: revision._id, status: ArticleRevisionStatus.CONFIRMED }, { $set: { status: revision.status } })
        }

        continue
      }

      published += 1

      if (!revision.publishedAt) await revision.updateOne({ $set: { publishedAt: now } })

      try {
        const slugs = new Set<string>([claimed.slug].filter((slug): slug is string => Boolean(slug)))

        if (claimed.translationGroupId) {
          for (const slug of await collectSlugsForTranslationGroups([String(claimed.translationGroupId)])) slugs.add(slug)
        }

        await forgetArticleMisses(slugs)

        const urls = await resolveIndexingUrlsForArticleTransition({
          before: {
            status: article.status,
            visibility: article.visibility,
            slug: article.slug,
            translationGroupId: article.translationGroupId,
            revisionSeo: null,
          },
          after: {
            status: claimed.status,
            visibility: claimed.visibility,
            slug: claimed.slug,
            translationGroupId: claimed.translationGroupId,
            revisionSeo: seoOf(revision.metadata),
          },
        })

        if (urls.length > 0) await notifySearchEngines(urls)

        if (article.scheduledBy) {
          const scheduler = await User.findById(article.scheduledBy).select('languageCode').lean()

          await notifyArticlePublishedFromRevision({
            recipientUserId: article.scheduledBy.toString(),
            articleId: article._id.toString(),
            revisionTitle: revision.title ?? null,
            t: getT(coerceLocale(scheduler?.languageCode) ?? getDefaultLocale()),
          })
        }
      } catch (error) {
        // The article is already published; search engines and the notification are best effort.
        logger.error('after-publish', article._id.toString(), error)
      }
    }

    return { published }
  },
}
