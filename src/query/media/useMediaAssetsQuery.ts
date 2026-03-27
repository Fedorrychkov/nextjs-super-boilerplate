import { ClientMediaApi, MediaAssetListResponse, MediaResourceType } from '~/api/media'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'

export const useMediaAssetsQuery = (params?: { resourceType?: MediaResourceType; limit?: number; enabled?: boolean }) => {
  return useQueryBuilder<MediaAssetListResponse, Error>({
    key: `media-assets-${params?.resourceType ?? 'all'}-${params?.limit ?? 50}`,
    enabled: params?.enabled ?? true,
    method: async () => {
      const api = new ClientMediaApi()

      return api.listMedia({
        resourceType: params?.resourceType,
        limit: params?.limit,
      })
    },
  })
}
