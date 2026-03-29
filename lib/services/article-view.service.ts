import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import ArticleRevision from '@lib/db/models/ArticleRevision'
import { verifyAccessToken } from '@lib/jwt/utils'
import { redisClient } from '@lib/redis'
import mongoose from 'mongoose'

import { ArticleStatus, ArticleVisibility } from '~/api/article'
import type { JwtPayload } from '~/api/auth/model'
import { UserRole } from '~/api/user'

const DEDUPE_TTL_SEC = 86_400
const REDIS_KEY_PREFIX = 'articleView:v1:'
const MIN_VISITOR_KEY_LEN = 8

export type ArticleViewSurface = 'public' | 'private'

export type RecordArticleViewInput = {
  slug: string
  surface: ArticleViewSurface
  visitorKey?: string | null
  accessToken?: string | null
}

export type RecordArticleViewResult = { ok: true; recorded: boolean } | { ok: false; status: number; message: string }

function tryJwt(accessToken: string | null | undefined): JwtPayload | null {
  if (!accessToken?.trim()) {
    return null
  }

  try {
    return verifyAccessToken(accessToken.trim())
  } catch {
    return null
  }
}

function canAccessPrivateArticle(visibility: ArticleVisibility, allowedRoles: UserRole[] | null | undefined, user: JwtPayload | null): boolean {
  if (visibility === ArticleVisibility.LINK_ONLY) {
    return true
  }

  if (visibility !== ArticleVisibility.PRIVATE) {
    return false
  }

  if (!user) {
    return false
  }

  const roles = allowedRoles ?? []

  if (roles.length === 0) {
    return true
  }

  return roles.includes(user.role)
}

/**
 * Records one reader view for the published revision (increments article + revision counters).
 * Deduped per visitor/user per article+revision per ~24h when Redis is available.
 */
export async function recordArticleView(input: RecordArticleViewInput): Promise<RecordArticleViewResult> {
  const slug = typeof input.slug === 'string' ? input.slug.trim().toLowerCase() : ''

  if (!slug) {
    return { ok: false, status: 400, message: 'slug_required' }
  }

  if (input.surface !== 'public' && input.surface !== 'private') {
    return { ok: false, status: 400, message: 'surface_invalid' }
  }

  const visitorKey = typeof input.visitorKey === 'string' ? input.visitorKey.trim() : ''
  const token = input.accessToken ?? null
  const user = tryJwt(token)

  await connectDB()

  const article = await Article.findOne({ slug, status: ArticleStatus.PUBLISHED }).exec()

  if (!article) {
    return { ok: false, status: 404, message: 'article_not_found' }
  }

  const visibility = article.visibility as ArticleVisibility

  if (input.surface === 'public') {
    if (visibility !== ArticleVisibility.PUBLIC) {
      return { ok: false, status: 400, message: 'surface_mismatch_public' }
    }
  } else {
    if (visibility !== ArticleVisibility.PRIVATE && visibility !== ArticleVisibility.LINK_ONLY) {
      return { ok: false, status: 400, message: 'surface_mismatch_private' }
    }

    if (!canAccessPrivateArticle(visibility, article.allowedRoles as UserRole[] | undefined, user)) {
      if (visibility === ArticleVisibility.PRIVATE && !user) {
        return { ok: false, status: 401, message: 'authentication_required' }
      }

      return { ok: false, status: 403, message: 'forbidden' }
    }
  }

  const revisionOid = article.revisionId

  if (!revisionOid) {
    return { ok: false, status: 404, message: 'revision_not_found' }
  }

  const dedupe = user != null ? `u:${user.sub}` : visitorKey.length >= MIN_VISITOR_KEY_LEN ? `v:${visitorKey}` : ''

  if (!dedupe) {
    return { ok: false, status: 400, message: 'visitor_key_required' }
  }

  const redis = redisClient.client

  if (redis) {
    const key = `${REDIS_KEY_PREFIX}${article._id.toString()}:${revisionOid.toString()}:${dedupe}`

    try {
      const set = await redis.set(key, '1', 'EX', DEDUPE_TTL_SEC, 'NX')

      if (set !== 'OK') {
        return { ok: true, recorded: false }
      }
    } catch {
      // Redis failure: still count (best-effort)
    }
  }

  await Article.updateOne({ _id: article._id }, { $inc: { viewCountTotal: 1 } }).exec()
  await ArticleRevision.updateOne({ _id: revisionOid }, { $inc: { viewCount: 1 } }).exec()

  return { ok: true, recorded: true }
}

export type ArticleViewsDashboardRow = {
  articleId: string
  slug: string | null
  visibility: string | null
  viewCountTotal: number
  currentRevisionId: string | null
  currentRevisionTitle: string | null
}

export type ArticleViewsDashboardPayload = {
  totalViews: number
  articles: ArticleViewsDashboardRow[]
}

export async function buildArticleViewsDashboard(limit = 80): Promise<ArticleViewsDashboardPayload> {
  await connectDB()

  const agg = await Article.aggregate<{ total: number }>([{ $group: { _id: null, total: { $sum: { $ifNull: ['$viewCountTotal', 0] } } } }]).exec()
  const totalViews = agg[0]?.total ?? 0

  const articles = await Article.find({ status: ArticleStatus.PUBLISHED })
    .sort({ viewCountTotal: -1, updatedAt: -1 })
    .limit(Math.min(200, Math.max(1, limit)))
    .select('slug visibility viewCountTotal revisionId')
    .lean()
    .exec()

  const revIds = articles.map((a) => a.revisionId).filter(Boolean) as mongoose.Types.ObjectId[]

  type LeanRev = { _id: unknown; title?: string | null }

  const revs =
    revIds.length > 0
      ? await ArticleRevision.find({ _id: { $in: revIds } })
          .select('title')
          .lean()
          .exec()
      : []

  const titleByRev = new Map<string, string | null>()

  for (const r of revs as LeanRev[]) {
    titleByRev.set(String(r._id), r.title ?? null)
  }

  const rows: ArticleViewsDashboardRow[] = articles.map((a) => ({
    articleId: String(a._id),
    slug: a.slug ?? null,
    visibility: a.visibility ?? null,
    viewCountTotal: a.viewCountTotal ?? 0,
    currentRevisionId: a.revisionId ? String(a.revisionId) : null,
    currentRevisionTitle: a.revisionId ? (titleByRev.get(String(a.revisionId)) ?? null) : null,
  }))

  return { totalViews, articles: rows }
}

export type ArticleRevisionViewRow = {
  revisionId: string
  title: string | null
  publishedAt: string | null
  viewCount: number
}

export type ArticleViewsByArticlePayload = {
  articleId: string
  slug: string | null
  viewCountTotal: number
  revisions: ArticleRevisionViewRow[]
}

export async function getArticleViewsByArticleId(articleId: string): Promise<ArticleViewsByArticlePayload | null> {
  await connectDB()

  if (!mongoose.Types.ObjectId.isValid(articleId)) {
    return null
  }

  const oid = new mongoose.Types.ObjectId(articleId)
  const article = await Article.findById(oid).select('slug viewCountTotal').lean().exec()

  if (!article) {
    return null
  }

  type LeanArticle = { _id: unknown; slug?: string | null; viewCountTotal?: number }
  const a = article as LeanArticle

  const revisions = await ArticleRevision.find({ articleId: oid }).sort({ publishedAt: -1, updatedAt: -1 }).select('title publishedAt viewCount').lean().exec()

  type LeanRevision = { _id: unknown; title?: string | null; publishedAt?: Date | null; viewCount?: number }

  return {
    articleId,
    slug: a.slug ?? null,
    viewCountTotal: a.viewCountTotal ?? 0,
    revisions: (revisions as LeanRevision[]).map((r) => ({
      revisionId: String(r._id),
      title: r.title ?? null,
      publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
      viewCount: r.viewCount ?? 0,
    })),
  }
}
