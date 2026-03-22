import { buildPaginationMeta, clampLimit } from '@lib/db/utils/buildPaginationMeta'
import { ValidationError } from '@lib/error/custom-errors'
import mongoose, { type Document, type HydratedDocument, type Model, type QueryFilter, Schema } from 'mongoose'

import { ArticleModel, ArticleStatus, ArticleVisibility } from '~/api/article'
import type { ArticleFilter } from '~/api/article/types'
import { SortBy, SortOrder } from '~/api/article/types'
import { UserRole } from '~/api/user'
import type { PaginationMeta } from '~/types/pagination'
import { time } from '~/utils/time'

export interface IArticle extends Document, Omit<ArticleModel, 'id' | 'revisionId'> {
  revisionId?: mongoose.Types.ObjectId | null
}

export interface IArticleModel extends Model<IArticle> {
  /**
   * List of articles with pagination.
   *
   * **Offset:** `limit` + `offset`, sorting `sortBy` + `_id` (stable order).
   *
   * **Cursor:** set `cursor` (hex last `_id` from previous page). `offset` is ignored.
   * Sorting is done only by `_id` in the direction of `sortOrder` (`asc` → next greater id, `desc` → smaller).
   * The `sortBy` field does not affect the order when `cursor` is present (only `_id`).
   */
  findListPaginated(filter: ArticleFilter): Promise<PaginationMeta<HydratedDocument<IArticle>>>
}

function applyArticleFilterFields(q: QueryFilter<IArticle>, rest: Partial<ArticleModel>) {
  if (rest.id != null && mongoose.Types.ObjectId.isValid(String(rest.id))) {
    q._id = new mongoose.Types.ObjectId(String(rest.id))
  }

  if (rest.slug !== undefined) {
    q.slug = rest.slug
  }

  if (rest.version !== undefined && rest.version !== null) {
    q.version = rest.version
  }

  if (rest.status !== undefined && rest.status !== null) {
    q.status = rest.status
  }

  if (rest.visibility !== undefined) {
    q.visibility = rest.visibility
  }

  if (rest.allowedRoles != null && rest.allowedRoles.length > 0) {
    q.allowedRoles = { $in: rest.allowedRoles }
  }

  if (rest.revisionId != null && mongoose.Types.ObjectId.isValid(String(rest.revisionId))) {
    q.revisionId = new mongoose.Types.ObjectId(String(rest.revisionId))
  }

  if (rest.publishedAt !== undefined) {
    q.publishedAt = rest.publishedAt
  }
}

function applyCreatedAtRange(q: QueryFilter<IArticle>, startOfDateIso?: string | null, endOfDateIso?: string | null) {
  if (!startOfDateIso && !endOfDateIso) {
    return
  }

  q.createdAt = {}

  if (startOfDateIso) {
    q.createdAt.$gte = startOfDateIso
  }

  if (endOfDateIso) {
    q.createdAt.$lte = endOfDateIso
  }
}

const ArticleSchema: Schema<IArticle> = new Schema<IArticle>(
  {
    _id: {
      type: Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
    slug: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    version: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(ArticleStatus),
      default: ArticleStatus.DRAFT,
      index: true,
    },
    visibility: {
      type: String,
      default: null,
      validate: {
        validator(v: string | null) {
          return v === null || (Object.values(ArticleVisibility) as string[]).includes(v)
        },
      },
    },
    allowedRoles: {
      type: [
        {
          type: String,
          enum: Object.values(UserRole),
        },
      ],
      default: [],
    },
    revisionId: {
      type: Schema.Types.ObjectId,
      ref: 'ArticleRevision',
      default: null,
      index: true,
    },
    publishedAt: {
      type: String,
      default: null,
    },
    createdAt: {
      type: String,
      default: () => time().toISOString(),
    },
    updatedAt: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

ArticleSchema.index({ slug: 1 }, { unique: true, sparse: true })
;(ArticleSchema.statics as Record<string, unknown>).findListPaginated = async function findListPaginated(
  this: Model<IArticle>,
  filter: ArticleFilter,
): Promise<PaginationMeta<HydratedDocument<IArticle>>> {
  const { limit: limitRaw, offset: offsetRaw, cursor, sortBy, sortOrder, startOfDateIso, endOfDateIso, ...rest } = filter

  const limit = clampLimit(limitRaw)
  const offset = cursor ? 0 : typeof offsetRaw === 'number' && !Number.isNaN(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0

  const base: QueryFilter<IArticle> = {}
  applyArticleFilterFields(base, rest)
  applyCreatedAtRange(base, startOfDateIso, endOfDateIso)

  const findQuery: QueryFilter<IArticle> = { ...base }

  const order = sortOrder === SortOrder.asc ? 1 : -1
  const sortField = sortBy ?? SortBy.createdAt

  let sort: Record<string, 1 | -1>

  if (cursor) {
    if (!mongoose.Types.ObjectId.isValid(cursor)) {
      throw new ValidationError('Invalid cursor: expected ObjectId hex string')
    }

    const oid = new mongoose.Types.ObjectId(cursor)
    findQuery._id = order === 1 ? { $gt: oid } : { $lt: oid }
    sort = { _id: order }
  } else {
    sort = { [sortField]: order, _id: order }
  }

  const count = await this.countDocuments(base)
  const list = await this.find(findQuery).sort(sort).skip(offset).limit(limit).exec()

  return buildPaginationMeta({
    list,
    count,
    limit: limitRaw,
    offset: offsetRaw,
    cursor,
  })
}

const Article = (mongoose.models.Article as IArticleModel) || mongoose.model<IArticle>('Article', ArticleSchema)

export default Article
