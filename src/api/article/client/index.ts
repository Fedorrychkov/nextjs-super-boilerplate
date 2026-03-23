import { Request } from '@lib/request'
import { AxiosInstance } from 'axios'

import { PaginationMeta } from '~/types'

import { ArticleModel } from '../model'
import { ArticleFilter } from '../types'

export class ClientArticleApi {
  private readonly client: AxiosInstance

  constructor(origin?: string, options?: { headers?: Record<string, string> }) {
    const config = origin ? { baseURL: origin, ...(options?.headers && { headers: options.headers }) } : undefined
    this.client = new Request(config).apiClient
  }

  async getArticles(params: ArticleFilter): Promise<PaginationMeta<ArticleModel>> {
    const response = await this.client.get('/api/v1/article/list', { params })

    return response.data
  }

  async getArticle(id: string): Promise<ArticleModel> {
    const response = await this.client.get(`/api/v1/article/get/${id}`)

    return response.data
  }

  async getArticleBySlug(slug: string): Promise<ArticleModel> {
    const response = await this.client.get(`/api/v1/article/get-by-slug/${slug}`)

    return response.data
  }

  async createArticle(dto: Partial<ArticleModel>): Promise<ArticleModel> {
    const response = await this.client.post('/api/v1/article/create', dto)

    return response.data
  }

  async updateArticle(id: string, dto: Partial<ArticleModel>): Promise<ArticleModel> {
    const response = await this.client.put('/api/v1/article/update', { id, ...dto })

    return response.data
  }
}
