import connectDB from '@lib/db/client'
import User from '@lib/db/models/User'
import UserSettings from '@lib/db/models/UserSettings'
import { ValidationError } from '@lib/error/custom-errors'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { userHasPassword } from '@lib/oauth/oauth-account.service'
import type { AuthSuccessResult } from '@lib/security/auth'
import { decryptSecret, verifyTotpCode } from '@lib/security/totp'
import { assertPasswordPolicy } from '@lib/validation/password-policy'
import { NextRequest, NextResponse } from 'next/server'

import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

type SetPasswordDto = {
  newPassword: string
  totpCode?: string
}

const handlerPost = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)
    const body = (await request.json()) as SetPasswordDto
    const userId = authResult.payload.sub

    if (await userHasPassword(userId)) {
      throw new ValidationError(t('auth.oauth.errors.passwordAlreadySet'))
    }

    if (!body.newPassword?.trim()) {
      throw new ValidationError(t('auth.errors.enterPassword'))
    }

    assertPasswordPolicy(body.newPassword, t)

    await connectDB()

    const settings = await UserSettings.findOne({ userId })

    if (settings?.mfaEnabled && settings.mfaSecret) {
      if (!body.totpCode?.trim()) {
        throw new ValidationError(t('totp.errors.challengeIdAndCodeAreRequired'))
      }

      const secret = decryptSecret(settings.mfaSecret)
      const totpValid = await verifyTotpCode(secret, body.totpCode.trim(), t)

      if (!totpValid.valid) {
        throw new ValidationError(t('totp.errors.invalidRemainingBackupCode'))
      }
    }

    const user = await User.findById(userId).select('+password')

    if (!user) {
      throw new ValidationError(t('user.errors.notFound'))
    }

    user.password = body.newPassword
    await user.save()

    return response.json({ success: true })
  })

export const POST = withGlobalRateLimit(withAuthMiddleware(handlerPost))
