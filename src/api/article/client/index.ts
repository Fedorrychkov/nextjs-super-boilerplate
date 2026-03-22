import { Request } from '@lib/request'
import { AxiosInstance } from 'axios'

import { PaginationMeta } from '~/types'

import { ArticleModel } from '../model'
import { ArticleFilter } from '../types'

export class ClientArticleApi {
  private readonly client: AxiosInstance

  constructor() {
    this.client = new Request().apiClient
  }

  async getArticles(params: ArticleFilter): Promise<PaginationMeta<ArticleModel>> {
    const response = await this.client.get('/api/v1/article/list', { params })

    return response.data
  }

  async createArticle(dto: Partial<ArticleModel>): Promise<ArticleModel> {
    const response = await this.client.post('/api/v1/article', dto)

    return response.data
  }

  async updateArticle(id: string, dto: Partial<ArticleModel>): Promise<ArticleModel> {
    const response = await this.client.put('/api/v1/article/update', { id, ...dto })

    return response.data
  }
}
