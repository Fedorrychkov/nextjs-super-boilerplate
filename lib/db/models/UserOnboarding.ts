import { ACCOUNT_CONFIG } from '@config/env'
import mongoose, { Document, Model, Schema } from 'mongoose'

export type OnboardingStepId = 'profile' | 'mfa' | 'push'

export interface IUserOnboarding extends Document {
  userId: mongoose.Types.ObjectId
  completedSteps: OnboardingStepId[]
  dismissedAt?: Date | null
  version: number
}

const UserOnboardingSchema: Schema<IUserOnboarding> = new Schema<IUserOnboarding>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    completedSteps: {
      type: [String],
      default: [],
    },
    dismissedAt: {
      type: Date,
      default: null,
    },
    version: {
      type: Number,
      default: ACCOUNT_CONFIG.onboardingVersion,
    },
  },
  {
    timestamps: true,
  },
)

const UserOnboarding: Model<IUserOnboarding> = mongoose.models.UserOnboarding || mongoose.model<IUserOnboarding>('UserOnboarding', UserOnboardingSchema)

export default UserOnboarding
