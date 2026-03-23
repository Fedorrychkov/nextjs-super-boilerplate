import { applyCreatedAtRange } from '@lib/db/utils/applyCreatedAtRange'
import { buildPaginationMeta, clampLimit } from '@lib/db/utils/buildPaginationMeta'
import { ValidationError } from '@lib/error/custom-errors'
import mongoose, { type Document, type HydratedDocument, type Model, type QueryFilter, Schema } from 'mongoose'

import { ArticleRevisionModel, ArticleRevisionStatus } from '~/api/article-revision'
import type { ArticleRevisionFilter } from '~/api/article-revision/types'
import { SortBy, SortOrder } from '~/api/article-revision/types'
import type { PaginationMeta } from '~/types/pagination'
import { time } from '~/utils/time'

export interface IArticleRevision extends Document, Omit<ArticleRevisionModel, 'id' | 'articleId'> {
  articleId: mongoose.Types.ObjectId
}

export interface IArticleRevisionModel extends Model<IArticleRevision> {
  /**
   * List of revisions with pagination.
   *
   * **Offset:** `limit` + `offset`, sorting `sortBy` + `_id`.
   *
   * **Cursor:** `cursor` — hex last `_id`; `offset` is ignored; sorting is done only by `_id`
   * in the direction of `sortOrder`. When `cursor`, the `sortBy` field does not affect the order.
   */
  findListPaginated(filter: ArticleRevisionFilter): Promise<PaginationMeta<HydratedDocument<IArticleRevision>>>
}

function applyArticleRevisionFilterFields(q: QueryFilter<IArticleRevision>, rest: Partial<ArticleRevisionModel>) {
  if (rest.id != null && mongoose.Types.ObjectId.isValid(String(rest.id))) {
    q._id = new mongoose.Types.ObjectId(String(rest.id))
  }

  if (rest.articleId != null && mongoose.Types.ObjectId.isValid(String(rest.articleId))) {
    q.articleId = new mongoose.Types.ObjectId(String(rest.articleId))
  }

  if (rest.content !== undefined) {
    q.content = rest.content
  }

  if (rest.status !== undefined && rest.status !== null) {
    q.status = rest.status
  }
}

const ArticleRevisionSchema: Schema<IArticleRevision> = new Schema<IArticleRevision>(
  {
    _id: {
      type: Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
    articleId: {
      type: Schema.Types.ObjectId,
      ref: 'Article',
      required: true,
      index: true,
    },
    content: {
      type: String,
      default: null,
    },
    title: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    thumbnailUrl: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(ArticleRevisionStatus),
      default: ArticleRevisionStatus.DRAFT,
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: () => time().toISOString(),
    },
    updatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

ArticleRevisionSchema.index({ articleId: 1, status: 1, updatedAt: -1 })
;(ArticleRevisionSchema.statics as Record<string, unknown>).findListPaginated = async function findListPaginated(
  this: Model<IArticleRevision>,
  filter: ArticleRevisionFilter,
): Promise<PaginationMeta<HydratedDocument<IArticleRevision>>> {
  const { limit: limitRaw, offset: offsetRaw, cursor, sortBy, sortOrder, startOfDateIso, endOfDateIso, ...rest } = filter

  const limit = clampLimit(limitRaw)
  const offset = cursor ? 0 : typeof offsetRaw === 'number' && !Number.isNaN(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0

  const base: QueryFilter<IArticleRevision> = {}
  applyArticleRevisionFilterFields(base, rest)
  applyCreatedAtRange<IArticleRevision>(base, startOfDateIso, endOfDateIso)

  const findQuery: QueryFilter<IArticleRevision> = { ...base }

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

const ArticleRevision = (mongoose.models.ArticleRevision as IArticleRevisionModel) || mongoose.model<IArticleRevision>('ArticleRevision', ArticleRevisionSchema)

export default ArticleRevision
