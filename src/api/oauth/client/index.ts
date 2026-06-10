import { Request } from '@lib/request'
import { AxiosInstance } from 'axios'

import type { PaginationMeta } from '~/types/pagination'

import type { OAuthAttemptFilter, OAuthAttemptItemModel } from '../types'

export class ClientOAuthAdminApi {
  private readonly client: AxiosInstance

  constructor() {
    this.client = new Request().apiClient
  }

  async listAttempts(filter: OAuthAttemptFilter = {}): Promise<PaginationMeta<OAuthAttemptItemModel>> {
    const response = await this.client.get('/api/v1/admin/oauth-attempts', { params: filter })

    return response.data
  }
}
