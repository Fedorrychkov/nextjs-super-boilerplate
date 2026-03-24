import { Request } from '@lib/request'
import { AxiosInstance } from 'axios'

import { PaginationMeta } from '~/types'

import type { PublicArticleListItem } from '../publicListQuery'
import type { ArticleFilter } from '../types'

export class ClientPublicArticleListApi {
  private readonly client: AxiosInstance

  constructor(origin?: string, options?: { headers?: Record<string, string> }) {
    const config = origin ? { baseURL: origin, ...(options?.headers && { headers: options.headers }) } : undefined
    this.client = new Request(config).apiClient
  }

  async getList(params: ArticleFilter): Promise<PaginationMeta<PublicArticleListItem>> {
    const entries = Object.entries(params).filter(([, v]) => v != null && v !== '')

    const response = await this.client.get('/api/v1/public/article/list', {
      params: Object.fromEntries(entries) as ArticleFilter,
    })

    return response.data
  }
}
