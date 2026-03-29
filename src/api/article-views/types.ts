export type ArticleViewsDashboardPayload = {
  totalViews: number
  articles: ArticleViewsDashboardRow[]
}

export type ArticleViewsDashboardRow = {
  articleId: string
  slug: string | null
  visibility: string | null
  viewCountTotal: number
  currentRevisionId: string | null
  currentRevisionTitle: string | null
}

export type ArticleViewsByArticlePayload = {
  articleId: string
  slug: string | null
  viewCountTotal: number
  revisions: ArticleRevisionViewRow[]
}

export type ArticleRevisionViewRow = {
  revisionId: string
  title: string | null
  publishedAt: string | null
  viewCount: number
}
