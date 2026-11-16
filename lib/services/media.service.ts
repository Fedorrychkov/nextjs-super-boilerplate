import connectDB from '@lib/db/client'
import ArticleRevision from '@lib/db/models/ArticleRevision'
import MediaAsset, { IMediaAsset } from '@lib/db/models/MediaAsset'
import { ValidationError } from '@lib/error/custom-errors'
import { buildUploadcareCdnUrl, deleteUploadcareFile, getUploadcareFileInfo, uploadFileToUploadcare } from '@lib/services/cdn-uploadcare.service'
import mongoose from 'mongoose'

import { MediaAssetDto, MediaProvider, MediaPurpose, MediaResourceType, MediaVisibility } from '~/api/media'
import { isProviderMimeConsistent } from '~/lib/security/fileSignature'

/**
 * The API shape of an asset. Explicit on purpose: `toObject()` used to ship `createdBy` (file ↔
 * person) and `originalUrl` / `providerFileId` (the storage address, bypassing `/cdn` and any
 * visibility rule) to every editor who opened the library.
 */
export function toMediaAssetDto(asset: IMediaAsset): MediaAssetDto {
  return {
    id: asset._id.toString(),
    resourceType: asset.resourceType,
    provider: asset.provider,
    originalFilename: asset.originalFilename ?? null,
    mimeType: asset.mimeType ?? null,
    sizeBytes: asset.sizeBytes ?? null,
    width: asset.width ?? null,
    height: asset.height ?? null,
    proxyPath: asset.proxyPath,
    purpose: asset.purpose ?? MediaPurpose.CMS,
    visibility: asset.visibility ?? MediaVisibility.PUBLIC,
    isDeleted: asset.isDeleted ?? false,
    createdAt: asset.createdAt ? new Date(asset.createdAt).toISOString() : null,
    updatedAt: asset.updatedAt ? new Date(asset.updatedAt).toISOString() : null,
  }
}

const inferResourceType = (mimeType?: string | null, fallback: MediaResourceType = MediaResourceType.OTHER): MediaResourceType => {
  if (!mimeType) return fallback

  if (mimeType.startsWith('image/')) return MediaResourceType.IMAGE

  if (mimeType.startsWith('video/')) return MediaResourceType.VIDEO

  if (mimeType.startsWith('audio/')) return MediaResourceType.AUDIO

  if (mimeType.includes('pdf') || mimeType.includes('officedocument') || mimeType.includes('spreadsheet') || mimeType.includes('word')) {
    return MediaResourceType.DOCUMENT
  }

  return fallback
}

export async function createMediaAssetFromBuffer(params: {
  buffer: Buffer
  filename: string
  contentType: string
  createdBy?: string | null
  resourceType?: MediaResourceType
}) {
  const bytes = new Uint8Array(params.buffer)
  const file = new File([bytes], params.filename, { type: params.contentType })

  return createMediaAsset({
    file,
    createdBy: params.createdBy,
    resourceType: params.resourceType ?? MediaResourceType.AUDIO,
  })
}

export async function createMediaAsset(params: {
  file: File
  createdBy?: string | null
  resourceType?: MediaResourceType
  /** Type sniffed from the bytes by the caller; the storage's own detection must agree or the file is dropped. */
  expectedMime?: string | null
  purpose?: MediaPurpose
  visibility?: MediaVisibility
}) {
  await connectDB()

  const uploadResult = await uploadFileToUploadcare(params.file)
  const info = await getUploadcareFileInfo(uploadResult.fileId)

  if (!isProviderMimeConsistent(params.expectedMime, info.mime_type)) {
    // The document is never created, so nothing points at the file: remove it, do not orphan it.
    await deleteUploadcareFile(uploadResult.fileId)

    throw new ValidationError('MEDIA_MIME_MISMATCH', { expected: params.expectedMime, detected: info.mime_type ?? null })
  }

  const resourceType = params.resourceType ?? inferResourceType(info.mime_type, MediaResourceType.IMAGE)

  const id = new mongoose.Types.ObjectId()

  const data = await MediaAsset.create({
    _id: id,
    resourceType,
    provider: MediaProvider.UPLOADCARE,
    providerFileId: uploadResult.fileId,
    originalFilename: info.original_filename ?? params.file.name ?? null,
    mimeType: info.mime_type ?? params.file.type ?? null,
    sizeBytes: info.size ?? params.file.size ?? null,
    width: info.image_info?.width ?? null,
    height: info.image_info?.height ?? null,
    proxyPath: `/cdn/${id}`,
    originalUrl: buildUploadcareCdnUrl(uploadResult.fileId),
    purpose: params.purpose ?? MediaPurpose.CMS,
    visibility: params.visibility ?? MediaVisibility.PUBLIC,
    createdBy: params.createdBy && mongoose.Types.ObjectId.isValid(params.createdBy) ? new mongoose.Types.ObjectId(params.createdBy) : null,
  })

  return data
}

export async function findMediaAssetById(id: string) {
  // A malformed id is "no such asset", not a CastError turned into a 500.
  if (!mongoose.Types.ObjectId.isValid(id)) return null

  await connectDB()

  return MediaAsset.findById(id)
}

export async function listMediaAssets(params?: { resourceType?: MediaResourceType; limit?: number }) {
  await connectDB()

  const limit = Math.min(Math.max(params?.limit ?? 50, 1), 200)
  const query: Record<string, unknown> = {
    isDeleted: false,
    // The CMS library lists CMS files only. `$ne` keeps documents written before the field
    // existed (no `purpose` at all) in the library, where they belong.
    purpose: { $ne: MediaPurpose.USER },
  }

  if (params?.resourceType) {
    query.resourceType = params.resourceType
  }

  return MediaAsset.find(query).sort({ createdAt: -1 }).limit(limit)
}

export async function markMediaAssetDeleted(id: string) {
  await connectDB()

  return MediaAsset.findByIdAndUpdate(id, { isDeleted: true }, { new: true })
}

export async function checkMediaAssetUsage(
  asset: { id: string; originalUrl?: string | null; proxyPath?: string | null; providerFileId?: string | null },
  articleRevisionId?: string | null,
) {
  await connectDB()

  const probes = [asset.originalUrl, asset.proxyPath, asset.providerFileId].filter((v): v is string => Boolean(v))

  if (!probes.length) return false

  const regexes = probes.map((v) => new RegExp(v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))

  const baseQuery: Record<string, unknown> = {}

  if (articleRevisionId && mongoose.Types.ObjectId.isValid(articleRevisionId)) {
    baseQuery._id = { $ne: new mongoose.Types.ObjectId(articleRevisionId) }
  }

  const revision = await ArticleRevision.findOne({
    ...baseQuery,
    $or: [
      ...regexes.map((rx) => ({ content: { $regex: rx } })),
      ...regexes.map((rx) => ({ thumbnailUrl: { $regex: rx } })),
      ...regexes.map((rx) => ({ 'metadata.seo.ogImageUrl': { $regex: rx } })),
      ...regexes.map(() => ({ 'metadata.media.thumbnail.assetId': asset.id })),
      ...regexes.map(() => ({ 'metadata.media.seoOgImage.assetId': asset.id })),
    ],
  })

  return Boolean(revision)
}

export async function deleteMediaAssetIfUnused(id: string, articleRevisionId?: string | null) {
  await connectDB()

  const asset = await MediaAsset.findById(id)

  if (!asset) return { deleted: false, reason: 'not_found' as const }

  if (asset.isDeleted) return { deleted: false, reason: 'already_deleted' as const }

  const used = await checkMediaAssetUsage(
    {
      id: asset._id.toString(),
      originalUrl: asset.originalUrl,
      proxyPath: asset.proxyPath,
      providerFileId: asset.providerFileId,
    },
    articleRevisionId,
  )

  if (used) return { deleted: false, reason: 'in_use' as const }

  await deleteUploadcareFile(asset.providerFileId)
  asset.isDeleted = true
  await asset.save()

  return { deleted: true as const, asset }
}
