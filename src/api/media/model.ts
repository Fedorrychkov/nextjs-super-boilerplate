export enum MediaResourceType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  OTHER = 'other',
}

export enum MediaProvider {
  UPLOADCARE = 'uploadcare',
}

export type MediaAssetModel = {
  id: string
  resourceType: MediaResourceType
  provider: MediaProvider
  providerFileId: string
  originalFilename?: string | null
  mimeType?: string | null
  sizeBytes?: number | null
  width?: number | null
  height?: number | null
  proxyPath: string
  originalUrl?: string | null
  isDeleted?: boolean | null
  createdBy?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export type MediaUploadResponse = {
  asset: MediaAssetModel
  proxyUrl: string
}

export type MediaAssetListResponse = {
  items: MediaAssetModel[]
}
