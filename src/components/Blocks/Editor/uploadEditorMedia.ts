import { MediaResourceType } from '~/api/media'
import { isMediaFileWithinUploadLimit } from '~/constants/media-upload'
import { logger } from '~/utils/logger'

export type EditorMediaUploadResult = { proxyUrl: string; assetId: string; proxyPath: string }

export async function uploadEditorMediaFile(file: File, resourceType: MediaResourceType): Promise<EditorMediaUploadResult | null> {
  if (!isMediaFileWithinUploadLimit(file)) {
    return null
  }

  const formData = new FormData()

  formData.append('file', file)
  formData.append('resourceType', resourceType)

  const response = await fetch('/api/v1/media/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    logger.error('Failed to upload media', { status: response.status, resourceType })

    return null
  }

  const data = (await response.json()) as {
    proxyUrl?: string
    asset?: { id?: string; proxyPath?: string }
  }

  if (!data.proxyUrl || !data.asset?.id) {
    return null
  }

  const proxyPath = data.asset.proxyPath ?? ''

  return { proxyUrl: data.proxyUrl, assetId: data.asset.id, proxyPath }
}
