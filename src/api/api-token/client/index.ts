import { Request } from '@lib/request'
import { AxiosInstance } from 'axios'

import type { PaginationMeta } from '~/types/pagination'

import type { ApiTokenCreatedModel, ApiTokenModel } from '../model'
import type { ApiTokenRolePolicyModel } from '../permissions'
import type { ApiTokenCreatePayload, ApiTokenFilter, ApiTokenPermissionsModel, ApiTokenRolePolicyUpdatePayload } from '../types'

export class ClientApiTokenApi {
  private readonly client: AxiosInstance

  constructor() {
    this.client = new Request().apiClient
  }

  async list(filter: ApiTokenFilter = {}): Promise<PaginationMeta<ApiTokenModel>> {
    const response = await this.client.get('/api/v1/api-token/list', { params: filter })

    return response.data
  }

  async create(payload: ApiTokenCreatePayload): Promise<ApiTokenCreatedModel> {
    const response = await this.client.post('/api/v1/api-token/create', payload)

    return response.data
  }

  async revoke(id: string): Promise<ApiTokenModel> {
    const response = await this.client.post(`/api/v1/api-token/revoke/${id}`)

    return response.data
  }

  async permissions(): Promise<ApiTokenPermissionsModel> {
    const response = await this.client.get('/api/v1/api-token/permissions')

    return response.data
  }

  async policyList(): Promise<{ list: ApiTokenRolePolicyModel[] }> {
    const response = await this.client.get('/api/v1/api-token/policy/list')

    return response.data
  }

  async policyUpdate(payload: ApiTokenRolePolicyUpdatePayload): Promise<ApiTokenRolePolicyModel> {
    const response = await this.client.put('/api/v1/api-token/policy/update', payload)

    return response.data
  }
}
