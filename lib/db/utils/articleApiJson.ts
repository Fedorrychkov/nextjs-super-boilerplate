import type { IArticle } from '@lib/db/models/Article'
import type { HydratedDocument } from 'mongoose'

import { time } from '~/utils/time'

/** Normalize mongoose Article document for JSON API (string ids, ISO dates). */
export function articleDocumentToApiJson(article: HydratedDocument<IArticle>) {
  const o = article.toObject()
  const plain = { ...o } as Record<string, unknown>

  delete plain._id

  return {
    ...plain,
    id: article._id.toString(),
    revisionId: article.revisionId?.toString() ?? null,
    listenAudioAssetId: article.listenAudioAssetId?.toString() ?? null,
    listenAudioSourceRevisionId: article.listenAudioSourceRevisionId?.toString() ?? null,
    publishedAt: o.publishedAt != null ? time(o.publishedAt as string | Date).toISOString() : null,
    updatedAt: o.updatedAt != null ? time(o.updatedAt as string | Date).toISOString() : null,
    createdAt: o.createdAt != null ? time(o.createdAt as string | Date).toISOString() : null,
  }
}
