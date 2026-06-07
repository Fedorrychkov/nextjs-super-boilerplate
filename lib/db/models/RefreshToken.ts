import mongoose, { Document, Model, Schema } from 'mongoose'

export interface IRefreshToken extends Document {
  token: string
  userId: mongoose.Types.ObjectId
  expiresAt: Date
  deviceLabel?: string | null
  userAgent?: string | null
  ip?: string | null
  lastSeenAt?: Date | null
  createdAt: Date
}

const RefreshTokenSchema: Schema = new Schema(
  {
    _id: {
      type: Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // Automatically delete expired tokens
    },
    deviceLabel: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    ip: {
      type: String,
      default: null,
    },
    lastSeenAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

const RefreshToken: Model<IRefreshToken> = mongoose.models.RefreshToken || mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema)

export default RefreshToken
