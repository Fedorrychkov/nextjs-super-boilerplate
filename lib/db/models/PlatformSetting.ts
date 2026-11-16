import mongoose, { type Model, Schema } from 'mongoose'

/**
 * A stored platform setting value. No record — the default from code applies
 * (`config/platform-settings.ts`). A secret lives only in `sealed`, encrypted.
 */
export interface IPlatformSetting {
  key: string
  value: unknown
  /** Encrypted value of a secret setting; `value` is empty for it. */
  sealed: string | null
  previousValue: unknown
  updatedBy: mongoose.Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
}

const PlatformSettingSchema = new Schema<IPlatformSetting>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, default: null },
    sealed: { type: String, default: null },
    previousValue: { type: Schema.Types.Mixed, default: null },
    updatedBy: { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: true, versionKey: false, minimize: false },
)

const PlatformSetting: Model<IPlatformSetting> =
  (mongoose.models.PlatformSetting as Model<IPlatformSetting>) || mongoose.model<IPlatformSetting>('PlatformSetting', PlatformSettingSchema)

export default PlatformSetting
