import mongoose, { Document, Model, Schema } from 'mongoose'

import { time } from '~/utils/time'

export interface IUserSettings extends Document {
  userId: mongoose.Types.ObjectId
  mfaEnabled: boolean
  mfaSecret: string | null
  mfaBackupCodes: string[]
  mfaCreatedAt?: Date
  mfaUpdatedAt?: Date
}

const UserSettingsSchema: Schema<IUserSettings> = new Schema<IUserSettings>(
  {
    _id: {
      type: Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    mfaEnabled: {
      type: Boolean,
      default: false,
    },
    mfaSecret: {
      type: String,
      default: null,
    },
    mfaBackupCodes: {
      type: [String],
      default: [],
    },
    mfaCreatedAt: {
      type: Date,
      default: () => time().toISOString(),
    },
    mfaUpdatedAt: {
      type: Date,
      default: () => time().toISOString(),
    },
  },
  {
    timestamps: { createdAt: 'mfaCreatedAt', updatedAt: 'mfaUpdatedAt' },
  },
)

const UserSettings: Model<IUserSettings> = mongoose.models.UserSettings || mongoose.model<IUserSettings>('UserSettings', UserSettingsSchema)

export default UserSettings
