import { useMutation } from 'react-query'

import { ClientMediaApi } from '~/api/media'

export const useDeleteMediaMutation = () => {
  const deleteMediaMutation = useMutation(async (params: { assetId: string; articleRevisionId?: string }) => {
    const api = new ClientMediaApi()

    return api.deleteMedia(params.assetId, params.articleRevisionId)
  })

  return { deleteMediaMutation }
}
