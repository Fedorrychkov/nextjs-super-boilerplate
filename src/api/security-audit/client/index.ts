import { Request } from '@lib/request'
import { AxiosInstance } from 'axios'

import type { PaginationMeta } from '~/types/pagination'

import type { SecurityAuditFilter, SecurityAuditItemModel } from '../index'

export class ClientSecurityAuditApi {
  private readonly client: AxiosInstance

  constructor() {
    this.client = new Request().apiClient
  }

  async list(filter: SecurityAuditFilter = {}): Promise<PaginationMeta<SecurityAuditItemModel>> {
    const response = await this.client.get('/api/v1/admin/security-audit', { params: filter })

    return response.data
  }
}
