import { Request } from '@lib/request'
import { AxiosInstance } from 'axios'

import { PaginationMeta } from '~/types'

import { ArticleRevisionModel } from '../model'
import { ArticleRevisionFilter } from '../types'

export class ClientArticleRevisionApi {
  private readonly client: AxiosInstance

  constructor(origin?: string, options?: { headers?: Record<string, string> }) {
    const config = origin ? { baseURL: origin, ...(options?.headers && { headers: options.headers }) } : undefined
    this.client = new Request(config).apiClient
  }

  async getArticleRevisions(params: ArticleRevisionFilter): Promise<PaginationMeta<ArticleRevisionModel>> {
    const response = await this.client.get('/api/v1/article-revision/list', { params })

    return response.data
  }

  async getArticleRevision(id: string): Promise<ArticleRevisionModel> {
    const response = await this.client.get(`/api/v1/article-revision/get/${id}`)

    return response.data
  }

  async createArticleRevision(dto: Partial<ArticleRevisionModel>): Promise<ArticleRevisionModel> {
    const response = await this.client.post('/api/v1/article-revision/create', dto)

    return response.data
  }

  async updateArticleRevision(id: string, dto: Partial<ArticleRevisionModel>): Promise<ArticleRevisionModel> {
    const response = await this.client.put('/api/v1/article-revision/update', { id, ...dto })

    return response.data
  }

  async deleteArticleRevision(id: string): Promise<void> {
    await this.client.delete(`/api/v1/article-revision/delete/${id}`)
  }
}
