import connectDB from '@lib/db/client'
import ArticleRevision from '@lib/db/models/ArticleRevision'
import MediaAsset from '@lib/db/models/MediaAsset'
import { buildUploadcareCdnUrl, deleteUploadcareFile, getUploadcareFileInfo, uploadFileToUploadcare } from '@lib/services/cdn-uploadcare.service'
import mongoose from 'mongoose'

import { MediaProvider, MediaResourceType } from '~/api/media'

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

export async function createMediaAsset(params: { file: File; createdBy?: string | null; resourceType?: MediaResourceType }) {
  await connectDB()

  const uploadResult = await uploadFileToUploadcare(params.file)
  const info = await getUploadcareFileInfo(uploadResult.fileId)
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
    createdBy: params.createdBy && mongoose.Types.ObjectId.isValid(params.createdBy) ? new mongoose.Types.ObjectId(params.createdBy) : null,
  })

  return data
}

export async function findMediaAssetById(id: string) {
  await connectDB()

  return MediaAsset.findById(id)
}

export async function listMediaAssets(params?: { resourceType?: MediaResourceType; limit?: number }) {
  await connectDB()

  const limit = Math.min(Math.max(params?.limit ?? 50, 1), 200)
  const query: Record<string, unknown> = {
    isDeleted: false,
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
