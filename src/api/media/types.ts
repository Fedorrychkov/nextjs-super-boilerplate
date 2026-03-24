import { MediaResourceType } from './model'

export type MediaUploadDto = {
  file: File
  resourceType?: MediaResourceType
}
