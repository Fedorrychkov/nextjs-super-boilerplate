import { useMutation } from 'react-query'

import { ClientMediaApi, MediaResourceType } from '~/api/media'

export const useUploadMediaMutation = () => {
  const uploadMediaMutation = useMutation(async (dto: { file: File; resourceType?: MediaResourceType }) => {
    const api = new ClientMediaApi()

    return api.uploadMedia(dto)
  })

  return { uploadMediaMutation }
}
