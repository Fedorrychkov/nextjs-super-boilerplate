import mongoose, { Document, Model, Schema } from 'mongoose'

export interface IPushSubscription extends Document {
  userId: string
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string | null
  createdAt: Date
  updatedAt: Date
}

const PushSubscriptionSchema: Schema<IPushSubscription> = new Schema(
  {
    _id: {
      type: Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
    },
    p256dh: {
      type: String,
      required: true,
    },
    auth: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: false,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

// Ensure (userId, endpoint) pair is unique
PushSubscriptionSchema.index({ userId: 1, endpoint: 1 }, { unique: true })

const PushSubscription: Model<IPushSubscription> =
  mongoose.models.PushSubscription || mongoose.model<IPushSubscription>('PushSubscription', PushSubscriptionSchema)

export default PushSubscription
