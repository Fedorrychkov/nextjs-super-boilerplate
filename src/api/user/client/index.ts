import { Request } from '@lib/request'
import { AxiosInstance } from 'axios'

import { PaginationMeta } from '~/types'

import { UserModel } from '../model'
import { UpdateUserDto, UserFilter, UserMfaStatusDto, UserPushStatusDto } from '../types'

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

  async updateUser(id: string, body: UpdateUserDto): Promise<{ success: true; message: string; user: Pick<UserModel, 'id' | 'email' | 'role' | 'status'> }> {
    const response = await this.client.put(`/api/v1/user/update/${id}`, body)

    return response.data
  }

  async getUserPushStatus(id: string): Promise<UserPushStatusDto> {
    const response = await this.client.get(`/api/v1/user/status/push/${id}`)

    return response.data
  }

  async getUserMfaStatus(id: string): Promise<UserMfaStatusDto> {
    const response = await this.client.get(`/api/v1/user/status/mfa/${id}`)

    return response.data
  }
}
