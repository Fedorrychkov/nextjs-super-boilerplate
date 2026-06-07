import { ACCOUNT_CONFIG } from '@config/env'
import type { OnboardingStepId } from '@lib/db/models/UserOnboarding'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { completeOnboardingStep, dismissOnboarding, getOnboardingState } from '@lib/services/onboarding.service'
import { NextRequest, NextResponse } from 'next/server'

import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handlerGet = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const state = await getOnboardingState(authResult.payload.sub)

    return response.json(state)
  })

const handlerPatch = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (!ACCOUNT_CONFIG.onboardingEnabled) {
      return response.json({ ok: false, error: t('onboarding.errors.featureDisabled') }, { status: 404 })
    }

    const body = await request.json()
    const action = body?.action as string | undefined

    if (action === 'dismiss') {
      const state = await dismissOnboarding(authResult.payload.sub)

      return response.json({ ok: true, ...state })
    }

    const stepId = body?.stepId as OnboardingStepId | undefined

    if (action === 'complete' && stepId) {
      const state = await completeOnboardingStep(authResult.payload.sub, stepId)

      return response.json({ ok: true, ...state })
    }

    return response.json({ ok: false, error: t('onboarding.errors.invalidParams') }, { status: 400 })
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handlerGet))
export const PATCH = withGlobalRateLimit(withAuthMiddleware(handlerPatch))
