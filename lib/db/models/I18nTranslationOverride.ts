import mongoose, { type Document, type Model, Schema } from 'mongoose'

import type { I18nTranslationOverrideModel } from '~/api/i18n'
import { time } from '~/utils/time'

export interface II18nTranslationOverride extends Document, Omit<I18nTranslationOverrideModel, 'id'> {}

const I18nTranslationOverrideSchema: Schema<II18nTranslationOverride> = new Schema<II18nTranslationOverride>(
  {
    _id: {
      type: Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
    localeCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    value: {
      type: String,
      required: true,
      default: '',
    },
    updatedByUserId: {
      type: String,
      default: null,
      trim: true,
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

I18nTranslationOverrideSchema.index({ localeCode: 1, key: 1 }, { unique: true })

const I18nTranslationOverride: Model<II18nTranslationOverride> =
  (mongoose.models.I18nTranslationOverride as Model<II18nTranslationOverride>) ||
  mongoose.model<II18nTranslationOverride>('I18nTranslationOverride', I18nTranslationOverrideSchema)

export default I18nTranslationOverride
