import { Request } from '@lib/request'
import { AxiosInstance } from 'axios'

import type { PaginationMeta } from '~/types/pagination'

import type { MachineAccessBlockPayload, MachineAccessUserDetail, MachineAccessUserRow } from '../model'

/** Admin-only client for the machine-access oversight endpoints (`/api/v1/machine-access/*`). */

export class ClientMachineAccessApi {
  private readonly client: AxiosInstance

  constructor() {
    this.client = new Request().apiClient
  }

  async users(params: { limit?: number; offset?: number } = {}): Promise<PaginationMeta<MachineAccessUserRow>> {
    const response = await this.client.get('/api/v1/machine-access/users', { params })

    return response.data
  }

  async userDetail(userId: string): Promise<MachineAccessUserDetail> {
    const response = await this.client.get(`/api/v1/machine-access/users/${userId}`)

    return response.data
  }

  async setBlocked(payload: MachineAccessBlockPayload): Promise<{ userId: string; blocked: boolean }> {
    const response = await this.client.post('/api/v1/machine-access/block', payload)

    return response.data
  }
}
