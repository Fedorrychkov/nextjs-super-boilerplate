import mongoose, { Document, Model, Schema } from 'mongoose'

export interface IRefreshToken extends Document {
  token: string
  userId: mongoose.Types.ObjectId
  expiresAt: Date
  createdAt: Date
}

const RefreshTokenSchema: Schema = new Schema(
  {
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
  },
  {
    timestamps: true,
  },
)

const RefreshToken: Model<IRefreshToken> = mongoose.models.RefreshToken || mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema)

export default RefreshToken
