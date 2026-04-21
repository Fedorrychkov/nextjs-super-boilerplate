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
  /** Optional UUID shared by all language versions for hreflang / admin linking. */
  translationGroupId?: string | null
  /** BCP-47 primary language tag (`ru`, `en`, …). */
  locale?: string | null
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

/** Row from `GET /api/v1/article/translation-siblings/:articleId` (admin). */
export type ArticleTranslationSiblingRow = {
  id: string
  slug: string
  locale: string | null
  status: string
  visibility: string
  title: string | null
  revisionId: string | null
}

/** Response from `GET /api/v1/article/translation-siblings/:articleId`. */
export type ArticleTranslationSiblingsResponse = {
  translationGroupId: string | null
  siblings: ArticleTranslationSiblingRow[]
}

/** Response from `POST /api/v1/article/translation-link`. */
export type ArticleTranslationLinkResponse = {
  translationGroupId: string
  articles: ArticleModel[]
}

/** Response from `POST /api/v1/article/translation-unlink`. */
export type ArticleTranslationUnlinkResponse = {
  articles: ArticleModel[]
}

/** Response from `POST /api/v1/article/translation-publish-batch`. */
export type ArticleTranslationPublishBatchResponse = {
  publishedIds: string[]
  articles: ArticleModel[]
}

/** Response from `POST /api/v1/article/translation-unpublish-batch`. */
export type ArticleTranslationUnpublishBatchResponse = {
  unpublishedIds: string[]
  articles: ArticleModel[]
}

/** Response from `POST /api/v1/article/translation-restore-published-batch`. */
export type ArticleTranslationRestorePublishedBatchResponse = {
  restoredIds: string[]
  articles: ArticleModel[]
}

/** Response from `POST /api/v1/article/translation-create`. */
export type ArticleTranslationCreateResponse = {
  article: ArticleModel
  revisionId: string
  translationGroupId: string
}

/** Response from `POST /api/v1/article/listen-audio/generate`. */
export type ArticleListenAudioGenerateResponse = {
  assetId: string
  proxyPath: string
  sourceRevisionId: string
  textTruncated: boolean
  generatedAt: string
}
