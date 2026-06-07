import { Request } from '@lib/request'
import { AxiosInstance } from 'axios'

import { PaginationMeta } from '~/types'

import { AuthUserSnapshot, UserModel } from '../model'
import { PushSubscriptionsListResponse, UpdateUserDto, UserFilter, UserMfaStatusDto, UserPushStatusDto } from '../types'

export class ClientUserApi {
  private readonly client: AxiosInstance

  constructor() {
    this.client = new Request().apiClient
  }

  async getProfile(): Promise<UserModel> {
    const response = await this.client.get('/api/v1/user/profile')

    return response.data
  }

  async getUser(userId: string): Promise<UserModel> {
    const response = await this.client.get(`/api/v1/user/get/${userId}`)

    return response.data
  }

  async getUsers(filter: Partial<UserFilter>): Promise<PaginationMeta<UserModel>> {
    const response = await this.client.get('/api/v1/user/list', { params: filter })

    return response.data
  }

  async updateUser(
    id: string,
    body: UpdateUserDto,
  ): Promise<{ success: true; message: string; user: AuthUserSnapshot & { createdAt?: string | null; updatedAt?: string | null } }> {
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

  async getUserPushSubscriptions(userId: string): Promise<PushSubscriptionsListResponse> {
    const response = await this.client.get(`/api/v1/user/push-subscriptions/${userId}`)

    return response.data
  }

  async deleteUserPushSubscription(userId: string, endpoint: string): Promise<void> {
    await this.client.delete(`/api/v1/user/push-subscriptions/${userId}`, { data: { endpoint } })
  }

  async adminResetUserMfa(userId: string): Promise<{ success: boolean }> {
    const response = await this.client.post(`/api/v1/user/${userId}/mfa/reset`)

    return response.data
  }

  async adminSetUserPassword(userId: string, newPassword: string): Promise<{ success: boolean }> {
    const response = await this.client.post(`/api/v1/user/${userId}/password/reset`, { newPassword })

    return response.data
  }
}
