import { Request } from '@lib/request'
import { AxiosInstance } from 'axios'

import type { PlatformSettingModel, PlatformSettingsListResponse } from '../model'

export class ClientPlatformSettingsApi {
  private readonly client: AxiosInstance

  constructor() {
    this.client = new Request().apiClient
  }

  async list(): Promise<PlatformSettingsListResponse> {
    const response = await this.client.get('/api/v1/admin/platform-settings')

    return response.data
  }

  /** `null` resets the setting to its default. */
  async update(key: string, value: unknown): Promise<PlatformSettingModel> {
    const response = await this.client.put(`/api/v1/admin/platform-settings/${encodeURIComponent(key)}`, { value })

    return response.data
  }
}
