import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import ArticleRevision from '@lib/db/models/ArticleRevision'
import { articleDocumentToApiJson } from '@lib/db/utils/articleApiJson'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { randomUUID } from 'crypto'
import mongoose from 'mongoose'
import { revalidatePath, revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

import { ArticleModel, ArticleStatus, ArticleVisibility } from '~/api/article'
import { ArticleRevisionMetadata, ArticleRevisionSeoMetadata, ArticleRevisionStatus } from '~/api/article-revision'
import { UserRole } from '~/api/user'
import { routes } from '~/constants'
import { publicArticleCacheTag } from '~/lib/cache/publicArticlePageCache'
import { getServerTFromNextRequest } from '~/lib/i18n/server'
import { validateCanonicalUrlForStorage } from '~/lib/seo/articleCanonical'
import { normalizeBcp47ArticleLocale } from '~/lib/seo/articleLanguage'
import { collectSlugsForTranslationGroups, loadArticlesInTranslationGroup } from '~/lib/seo/articleTranslationAlternates'
import { seoConfig } from '~/lib/seo/config'
import { time } from '~/utils/time'

const SLUG_RE = /^[a-z0-9-]+$/

type Body = {
  sourceArticleId?: string | null
  /** Revision to clone (must belong to `sourceArticleId`). Defaults to source article’s `revisionId` when omitted. */
  sourceRevisionId?: string | null
  locale?: string | null
  slug?: string | null
}

type SourceRevisionLean = {
  title?: string | null
  description?: string | null
  content?: string | null
  thumbnailUrl?: string | null
  metadata?: unknown
  articleId: mongoose.Types.ObjectId
}

function cloneRevisionMetadata(raw: unknown): ArticleRevisionMetadata {
  if (raw == null || typeof raw !== 'object') {
    return {}
  }

  try {
    return JSON.parse(JSON.stringify(raw)) as ArticleRevisionMetadata
  } catch {
    return {}
  }
}

function isMongoDuplicateKey(e: unknown): boolean {
  return Boolean(e && typeof e === 'object' && 'code' in e && (e as { code: unknown }).code === 11_000)
}

async function ensureUniqueSlug(base: string): Promise<string> {
  for (let i = 0; i < 500; i += 1) {
    const candidate = i === 0 ? base : `${base}-${i}`
    const exists = await Article.exists({ slug: candidate })

    if (!exists) {
      return candidate
    }
  }

  return `${base}-${Date.now()}`
}

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = getServerTFromNextRequest(request)

    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const body = (await request.json()) as Body
    const sourceId = typeof body.sourceArticleId === 'string' ? body.sourceArticleId.trim() : ''

    if (!sourceId || !mongoose.Types.ObjectId.isValid(sourceId)) {
      return NextResponse.json({ message: t('article.errors.idRequired') }, { status: 400 })
    }

    const targetLocale = normalizeBcp47ArticleLocale(typeof body.locale === 'string' ? body.locale : '')

    if (!targetLocale) {
      return NextResponse.json({ message: t('article.errors.translationLocaleInvalid') }, { status: 400 })
    }

    await connectDB()

    const source = await Article.findById(sourceId)

    if (!source) {
      return NextResponse.json({ message: t('article.errors.notFound') }, { status: 404 })
    }

    const sourceLocaleNorm = normalizeBcp47ArticleLocale(source.locale != null ? String(source.locale) : null)

    if (sourceLocaleNorm != null && sourceLocaleNorm === targetLocale) {
      return NextResponse.json({ message: t('article.errors.translationSameLocaleAsSource') }, { status: 400 })
    }

    let groupId = source.translationGroupId != null && String(source.translationGroupId).trim() ? String(source.translationGroupId).trim() : ''

    const updatedAt = time().toISOString()

    if (!groupId) {
      groupId = randomUUID()
      await Article.updateOne({ _id: source._id }, { $set: { translationGroupId: groupId, updatedAt } })
    }

    const siblings = await loadArticlesInTranslationGroup(groupId)
    const taken = siblings.some((row) => row.locale != null && String(row.locale).trim().toLowerCase() === targetLocale)

    if (taken) {
      return NextResponse.json({ message: t('article.errors.translationLocaleAlreadyInGroup') }, { status: 409 })
    }

    const rawSlug = body.slug != null ? String(body.slug).trim().toLowerCase() : ''
    let finalSlug: string

    if (rawSlug) {
      if (!SLUG_RE.test(rawSlug) || rawSlug.length < 2) {
        return NextResponse.json({ message: t('article.errors.translationSlugInvalid') }, { status: 400 })
      }

      if (await Article.exists({ slug: rawSlug })) {
        return NextResponse.json({ message: t('article.errors.translationSlugTaken') }, { status: 409 })
      }

      finalSlug = rawSlug
    } else {
      const primary = targetLocale.split('-')[0] ?? targetLocale
      const baseSlug = source.slug?.trim() ? `${String(source.slug).trim()}-${primary}` : `article-${String(source._id).slice(-8)}-${primary}`

      if (!SLUG_RE.test(baseSlug)) {
        return NextResponse.json({ message: t('article.errors.translationSlugInvalid') }, { status: 400 })
      }

      finalSlug = await ensureUniqueSlug(baseSlug)
    }

    const requestedRevId = typeof body.sourceRevisionId === 'string' ? body.sourceRevisionId.trim() : ''
    let sourceRevisionLean: SourceRevisionLean | null = null

    if (requestedRevId) {
      if (!mongoose.Types.ObjectId.isValid(requestedRevId)) {
        return NextResponse.json({ message: t('article.errors.translationSourceRevisionInvalid') }, { status: 400 })
      }

      const rev = await ArticleRevision.findById(requestedRevId).lean()

      if (!rev || String(rev.articleId) !== sourceId) {
        return NextResponse.json({ message: t('article.errors.translationSourceRevisionInvalid') }, { status: 400 })
      }

      sourceRevisionLean = rev as unknown as SourceRevisionLean
    } else if (source.revisionId) {
      const rev = await ArticleRevision.findById(source.revisionId).lean()
      sourceRevisionLean = rev ? (rev as unknown as SourceRevisionLean) : null
    }

    if (!sourceRevisionLean) {
      return NextResponse.json({ message: t('article.errors.articleRevisionNotFound') }, { status: 400 })
    }

    const visibility = (source.visibility as ArticleVisibility | undefined) ?? ArticleVisibility.PUBLIC
    const canonicalValidation = validateCanonicalUrlForStorage(null, seoConfig.siteUrl, t)

    if (!canonicalValidation.ok) {
      return NextResponse.json({ message: canonicalValidation.message }, { status: 400 })
    }

    const metadata = cloneRevisionMetadata(sourceRevisionLean.metadata)
    const seoMerged: ArticleRevisionSeoMetadata = { ...(metadata.seo ?? {}) }
    seoMerged.language = targetLocale
    /** Old canonical targets the source URL; new article gets default canonical from slug when editors save / render. */
    seoMerged.canonicalUrl = null
    metadata.seo = seoMerged

    const newTitle =
      (sourceRevisionLean.title as string | null | undefined)?.trim() || t('article.ui.translations.newDraftTitleFallback', { locale: targetLocale })
    const newDescription = (sourceRevisionLean.description as string | null | undefined) ?? null
    const newContent = (sourceRevisionLean.content as string | null | undefined) ?? null
    const newThumbnailUrl = (sourceRevisionLean.thumbnailUrl as string | null | undefined) ?? null

    try {
      const newArticleDoc = await Article.create({
        slug: finalSlug,
        status: ArticleStatus.DRAFT,
        visibility,
        allowedRoles: Array.isArray(source.allowedRoles) ? source.allowedRoles : [],
        allowAiTraining: source.allowAiTraining !== false,
        translationGroupId: groupId,
        locale: targetLocale,
        revisionId: null,
        updatedAt,
      })

      const revision = await ArticleRevision.create({
        articleId: newArticleDoc._id,
        title: newTitle,
        description: newDescription,
        content: newContent,
        thumbnailUrl: newThumbnailUrl,
        status: ArticleRevisionStatus.DRAFT,
        metadata,
      })

      await newArticleDoc.updateOne({ revisionId: revision._id, updatedAt: time().toISOString() })

      const populated = await Article.findById(newArticleDoc._id)

      if (!populated) {
        return NextResponse.json({ message: t('article.errors.notFound') }, { status: 404 })
      }

      const groupIds = new Set<string>([groupId])
      const slugs = await collectSlugsForTranslationGroups([...groupIds])

      for (const s of slugs) {
        revalidateTag(publicArticleCacheTag(s), 'max')
        revalidatePath(routes.articlePublic.path.replace(':slug', s))
      }

      revalidatePath('/sitemap.xml')
      revalidatePath('/rss.xml')

      return response.json({
        article: articleDocumentToApiJson(populated) as ArticleModel,
        revisionId: revision._id.toString(),
        translationGroupId: groupId,
      })
    } catch (e) {
      if (isMongoDuplicateKey(e)) {
        return NextResponse.json({ message: t('article.errors.translationDuplicateConstraint') }, { status: 409 })
      }

      throw e
    }
  })

export const POST = withGlobalRateLimit(withAuthMiddleware(handler))
