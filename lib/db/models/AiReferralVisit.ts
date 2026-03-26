import mongoose, { Document, Schema } from 'mongoose'

import { AI_REFERRAL_SOURCES, AiReferralVisitModel } from '~/api/ai-referrals/model'
import { time } from '~/utils/time'

export interface IAiReferralVisit extends Document, Omit<AiReferralVisitModel, 'id'> {}

const THIRTY_DAYS_SEC = 30 * 24 * 60 * 60

const AiReferralVisitSchema = new Schema<IAiReferralVisit>(
  {
    source: {
      type: String,
      required: true,
      enum: AI_REFERRAL_SOURCES,
      index: true,
    },
    pathname: { type: String, required: true, maxlength: 1024, index: true },
    referrer: { type: String, required: true, maxlength: 2048 },
    referrerHost: { type: String, required: true, maxlength: 512, index: true },
    userAgent: { type: String, default: null, maxlength: 2048 },
    createdAt: {
      type: Date,
      default: () => time().toISOString(),
    },
  },
  { versionKey: false },
)

AiReferralVisitSchema.index({ createdAt: 1 }, { expireAfterSeconds: THIRTY_DAYS_SEC })

const AiReferralVisit =
  (mongoose.models.AiReferralVisit as mongoose.Model<IAiReferralVisit>) || mongoose.model<IAiReferralVisit>('AiReferralVisit', AiReferralVisitSchema)

export default AiReferralVisit
