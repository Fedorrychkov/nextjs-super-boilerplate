export type ArticleRevisionModel = {
  id: string
  articleId: string
  content?: string | null
  metadata?: Record<string, any>
  previewUrl?: string | null
  /**
   * Draft (editor) or confirmed after publication
   */
  status?: ArticleRevisionStatus | null
  publishedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export enum ArticleRevisionStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
}
