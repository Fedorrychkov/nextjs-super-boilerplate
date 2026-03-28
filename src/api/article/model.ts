import { UserRole } from '../user'

export type ArticleModel = {
  id: string
  slug?: string | null
  version?: number | null
  status?: ArticleStatus | null
  visibility?: ArticleVisibility | null
  /**
   * If Private, we can choose which roles can access the article
   */
  allowedRoles?: UserRole[] | null
  /**
   * We can get content from current revision
   */
  revisionId?: string | null
  publishedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  /** MediaAsset id (audio/mpeg) — AI listen / TTS narration of the article body. */
  listenAudioAssetId?: string | null
  /** ArticleRevision id whose plain text was used for the last TTS run (detect stale vs current `revisionId`). */
  listenAudioSourceRevisionId?: string | null
  listenAudioGeneratedAt?: string | null
  /**
   * If false, public article HTTP responses use `Content-Signal: ai-train=no` (etc.).
   * Default true — allow training-related signaling per publisher choice.
   */
  allowAiTraining?: boolean | null
  /** Lifetime view events summed for dashboards (`$inc` on record). */
  viewCountTotal?: number | null
}

export enum ArticleVisibility {
  /**
   * Visible to everyone
   */
  PUBLIC = 'public',
  /**
   * Only for registered users
   */
  PRIVATE = 'private',
  /**
   * Public but only accessible via link
   */
  LINK_ONLY = 'link_only',
}

export enum ArticleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  UNPUBLISHED = 'unpublished',
}

/** Response from `POST /api/v1/article/listen-audio/generate`. */
export type ArticleListenAudioGenerateResponse = {
  assetId: string
  proxyPath: string
  sourceRevisionId: string
  textTruncated: boolean
  generatedAt: string
}
