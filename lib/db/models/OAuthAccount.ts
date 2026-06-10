import type { OAuthProviderId } from '@config/auth-oauth'
import mongoose, { type Document, Schema } from 'mongoose'

export interface IOAuthAccount extends Document {
  userId: mongoose.Types.ObjectId
  provider: OAuthProviderId
  providerUserId: string
  providerEmail?: string | null
  providerLogin?: string | null
  scopes?: string[]
  accessTokenEnc?: string | null
  refreshTokenEnc?: string | null
  tokenExpiresAt?: Date | null
  linkedAt: Date
  lastUsedAt?: Date | null
}

const OAuthAccountSchema = new Schema<IOAuthAccount>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      index: true,
    },
    providerUserId: {
      type: String,
      required: true,
      trim: true,
    },
    providerEmail: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
    providerLogin: {
      type: String,
      default: null,
      trim: true,
    },
    scopes: {
      type: [String],
      default: [],
    },
    accessTokenEnc: {
      type: String,
      default: null,
      select: false,
    },
    refreshTokenEnc: {
      type: String,
      default: null,
      select: false,
    },
    tokenExpiresAt: {
      type: Date,
      default: null,
    },
    linkedAt: {
      type: Date,
      default: () => new Date(),
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: false },
)

OAuthAccountSchema.index({ provider: 1, providerUserId: 1 }, { unique: true })

const OAuthAccount = (mongoose.models.OAuthAccount as mongoose.Model<IOAuthAccount>) || mongoose.model<IOAuthAccount>('OAuthAccount', OAuthAccountSchema)

export default OAuthAccount
