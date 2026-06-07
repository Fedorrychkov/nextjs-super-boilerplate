import { ACCOUNT_CONFIG } from '@config/env'
import connectDB from '@lib/db/client'
import UserOnboarding, { IUserOnboarding, OnboardingStepId } from '@lib/db/models/UserOnboarding'
import UserSettings from '@lib/db/models/UserSettings'
import { pushSubscriptionService } from '@lib/services/push-subscription.service'
import mongoose from 'mongoose'

export type OnboardingStepState = {
  id: OnboardingStepId
  completed: boolean
  optional?: boolean
}

export type OnboardingState = {
  enabled: boolean
  dismissed: boolean
  version: number
  steps: OnboardingStepState[]
  pendingCount: number
  complete: boolean
}

const ALL_STEPS: OnboardingStepId[] = ['profile', 'mfa', 'push']

function stepOptional(step: OnboardingStepId): boolean {
  return step === 'push'
}

function isStepEnabled(step: OnboardingStepId): boolean {
  if (step === 'push') {
    return ACCOUNT_CONFIG.onboardingPushPromptEnabled
  }

  return true
}

export function assertOnboardingEnabled(): void {
  if (!ACCOUNT_CONFIG.onboardingEnabled) {
    throw new Error('ONBOARDING_DISABLED')
  }
}

export async function getOnboardingState(userId: string): Promise<OnboardingState> {
  if (!ACCOUNT_CONFIG.onboardingEnabled) {
    return {
      enabled: false,
      dismissed: false,
      version: ACCOUNT_CONFIG.onboardingVersion,
      steps: [],
      pendingCount: 0,
      complete: true,
    }
  }

  await connectDB()

  const doc =
    (await UserOnboarding.findOne({ userId }).lean()) ??
    ({
      userId: new mongoose.Types.ObjectId(userId),
      completedSteps: [],
      dismissedAt: null,
      version: ACCOUNT_CONFIG.onboardingVersion,
    } as Pick<IUserOnboarding, 'userId' | 'completedSteps' | 'dismissedAt' | 'version'>)

  const completed = new Set<OnboardingStepId>((doc.completedSteps ?? []) as OnboardingStepId[])
  const settings = await UserSettings.findOne({ userId }).lean()
  const pushSubs = await pushSubscriptionService.list({ userId })

  const autoCompleted = new Set<OnboardingStepId>(completed)

  autoCompleted.add('profile')

  if (settings?.mfaEnabled) {
    autoCompleted.add('mfa')
  }

  if (pushSubs.length > 0) {
    autoCompleted.add('push')
  }

  const steps: OnboardingStepState[] = ALL_STEPS.filter(isStepEnabled).map((id) => ({
    id,
    completed: autoCompleted.has(id),
    optional: stepOptional(id),
  }))

  const pendingCount = steps.filter((step) => !step.completed && !step.optional).length
  const complete = steps.every((step) => step.completed || step.optional)

  const storedVersion = doc.version ?? ACCOUNT_CONFIG.onboardingVersion
  const dismissedForCurrentVersion = Boolean(doc.dismissedAt) && storedVersion === ACCOUNT_CONFIG.onboardingVersion

  return {
    enabled: true,
    dismissed: dismissedForCurrentVersion,
    version: ACCOUNT_CONFIG.onboardingVersion,
    steps,
    pendingCount,
    complete,
  }
}

export async function completeOnboardingStep(userId: string, stepId: OnboardingStepId): Promise<OnboardingState> {
  assertOnboardingEnabled()

  if (!ALL_STEPS.includes(stepId)) {
    throw new Error('ONBOARDING_INVALID_STEP')
  }

  await connectDB()

  await UserOnboarding.findOneAndUpdate(
    { userId },
    {
      $addToSet: { completedSteps: stepId },
      $setOnInsert: { version: ACCOUNT_CONFIG.onboardingVersion },
    },
    { upsert: true, new: true },
  )

  return getOnboardingState(userId)
}

export async function dismissOnboarding(userId: string): Promise<OnboardingState> {
  assertOnboardingEnabled()

  await connectDB()

  await UserOnboarding.findOneAndUpdate(
    { userId },
    {
      $set: { dismissedAt: new Date(), version: ACCOUNT_CONFIG.onboardingVersion },
      $setOnInsert: { completedSteps: ['profile'] },
    },
    { upsert: true, new: true },
  )

  return getOnboardingState(userId)
}
