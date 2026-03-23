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
