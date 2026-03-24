import mongoose, { Document, Schema } from 'mongoose'

import { MediaAssetModel, MediaProvider, MediaResourceType } from '~/api/media'
import { time } from '~/utils/time'

export interface IMediaAsset extends Document, Omit<MediaAssetModel, 'id' | 'createdBy'> {
  createdBy?: mongoose.Types.ObjectId | null
}

const MediaAssetSchema: Schema<IMediaAsset> = new Schema<IMediaAsset>(
  {
    _id: {
      type: Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
    resourceType: {
      type: String,
      enum: Object.values(MediaResourceType),
      default: MediaResourceType.IMAGE,
      index: true,
    },
    provider: {
      type: String,
      enum: Object.values(MediaProvider),
      default: MediaProvider.UPLOADCARE,
      index: true,
    },
    providerFileId: {
      type: String,
      required: true,
      index: true,
    },
    originalFilename: {
      type: String,
      default: null,
    },
    mimeType: {
      type: String,
      default: null,
      index: true,
    },
    sizeBytes: {
      type: Number,
      default: null,
    },
    width: {
      type: Number,
      default: null,
    },
    height: {
      type: Number,
      default: null,
    },
    proxyPath: {
      type: String,
      required: true,
      unique: true,
    },
    originalUrl: {
      type: String,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    createdAt: {
      type: Date,
      default: () => time().toISOString(),
    },
    updatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

MediaAssetSchema.index({ provider: 1, providerFileId: 1 }, { unique: true })

const MediaAsset = (mongoose.models.MediaAsset as mongoose.Model<IMediaAsset>) || mongoose.model<IMediaAsset>('MediaAsset', MediaAssetSchema)

export default MediaAsset
