import { MediaResourceType } from './model'

export type MediaUploadDto = {
  file: File
  resourceType?: MediaResourceType
}

export type MediaListDto = {
  resourceType?: MediaResourceType
  limit?: number
}
