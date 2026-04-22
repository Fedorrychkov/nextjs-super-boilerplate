import mongoose, { type Document, type Model, Schema } from 'mongoose'

import type { I18nLocaleModel } from '~/api/i18n'
import { time } from '~/utils/time'

export interface II18nLocale extends Document, Omit<I18nLocaleModel, 'id'> {}

const I18nLocaleSchema: Schema<II18nLocale> = new Schema<II18nLocale>(
  {
    _id: {
      type: Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    label: {
      type: String,
      default: null,
      trim: true,
    },
    isSystem: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdAt: {
      type: String,
      default: () => time().toISOString(),
    },
    updatedAt: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

const I18nLocale: Model<II18nLocale> = (mongoose.models.I18nLocale as Model<II18nLocale>) || mongoose.model<II18nLocale>('I18nLocale', I18nLocaleSchema)

export default I18nLocale
