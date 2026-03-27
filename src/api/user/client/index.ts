import { Request } from '@lib/request'
import { AxiosInstance } from 'axios'

import { PaginationMeta } from '~/types'

import { UserModel } from '../model'
import { UserFilter } from '../types'

export class ClientUserApi {
  private readonly client: AxiosInstance

  constructor() {
    this.client = new Request().apiClient
  }

  async getProfile(): Promise<UserModel> {
    const response = await this.client.get('/api/v1/user/profile')

    return response.data
  }

  async getUsers(filter: Partial<UserFilter>): Promise<PaginationMeta<UserModel>> {
    const response = await this.client.get('/api/v1/user/list', { params: filter })

    return response.data
  }
}
