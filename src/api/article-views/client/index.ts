import { Request } from '@lib/request'
import { AxiosInstance } from 'axios'

import type { ArticleViewsByArticlePayload, ArticleViewsDashboardPayload } from '../types'

export class ClientArticleViewsApi {
  private readonly client: AxiosInstance

  constructor(origin?: string, options?: { headers?: Record<string, string> }) {
    const config = origin ? { baseURL: origin, ...(options?.headers && { headers: options.headers }) } : undefined
    this.client = new Request(config).apiClient
  }

  async getDashboard(limit?: number): Promise<ArticleViewsDashboardPayload> {
    const response = await this.client.get<ArticleViewsDashboardPayload>('/api/v1/article/views/dashboard', {
      params: limit != null ? { limit } : undefined,
    })

    return response.data
  }

  async getByArticle(articleId: string): Promise<ArticleViewsByArticlePayload> {
    const response = await this.client.get<ArticleViewsByArticlePayload>(`/api/v1/article/views/by-article/${articleId}`)

    return response.data
  }
}
