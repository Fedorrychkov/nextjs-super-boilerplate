import { Request } from '@lib/request'
import { AxiosInstance } from 'axios'

import { MediaAssetModel, MediaUploadResponse } from '../model'
import { MediaUploadDto } from '../types'

export class ClientMediaApi {
  private readonly client: AxiosInstance

  constructor(origin?: string, options?: { headers?: Record<string, string> }) {
    const config = origin ? { baseURL: origin, ...(options?.headers && { headers: options.headers }) } : undefined
    this.client = new Request(config).apiClient
  }

  async uploadMedia(dto: MediaUploadDto): Promise<MediaUploadResponse> {
    const formData = new FormData()
    formData.append('file', dto.file)

    if (dto.resourceType) {
      formData.append('resourceType', dto.resourceType)
    }

    const response = await this.client.post('/api/v1/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    return response.data
  }

  async deleteMedia(assetId: string, articleRevisionId?: string): Promise<{ asset: MediaAssetModel }> {
    const response = await this.client.delete(`/api/v1/media/delete/${assetId}`, {
      params: {
        articleRevisionId,
      },
    })

    return response.data
  }
}
