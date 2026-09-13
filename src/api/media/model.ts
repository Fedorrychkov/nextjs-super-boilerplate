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

/** Whose file this is: the CMS library (editors) or a person's own file (avatar, attachment). */
export enum MediaPurpose {
  CMS = 'cms',
  USER = 'user',
}

/** `private` is never served by the public `/cdn` route — only by the authorised file route, to the owner or an admin. */
export enum MediaVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
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
  purpose?: MediaPurpose | null
  visibility?: MediaVisibility | null
  isDeleted?: boolean | null
  createdBy?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

/** What the API returns: no storage address (`providerFileId`, `originalUrl`) and no `createdBy`. */
export type MediaAssetDto = Omit<MediaAssetModel, 'providerFileId' | 'originalUrl' | 'createdBy'>

export type MediaUploadResponse = {
  asset: MediaAssetDto
  proxyUrl: string
}

export type MediaAssetListResponse = {
  items: MediaAssetDto[]
}
