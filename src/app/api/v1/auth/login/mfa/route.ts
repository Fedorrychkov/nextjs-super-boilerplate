import { setAuthCookies } from '@lib/cookies'
import connectDB from '@lib/db/client'
import User from '@lib/db/models/User'
import UserSettings from '@lib/db/models/UserSettings'
import { ValidationError } from '@lib/error/custom-errors'
import { apiErrorHandlerContainer, withGlobalRateLimit } from '@lib/middleware'
import { consumeLoginChallenge } from '@lib/security/login-challenge'
import { consumeBackupCode, decryptSecret, verifyTotpCode } from '@lib/security/totp'
import { authService } from '@lib/services/auth.service'
import { NextRequest } from 'next/server'

import { getPreferredLanguageCodeFromAcceptLanguage } from '~/lib/i18n/detectLocale'
import { getServerTFromNextRequest } from '~/lib/i18n/server'

type MfaLoginDto = {
  challengeId: string
  code: string
}

const handler = (request: NextRequest) => {
  return apiErrorHandlerContainer(request)(async (res, req) => {
    const body = (await req.json()) as MfaLoginDto
    const languageCode = getPreferredLanguageCodeFromAcceptLanguage(req.headers.get('accept-language'))

    const { t } = getServerTFromNextRequest(request)

    if (!body.challengeId || !body.code) {
      throw new ValidationError(t('totp.errors.challengeIdAndCodeAreRequired'))
    }

    const challenge = await consumeLoginChallenge(body.challengeId)

    if (!challenge) {
      throw new ValidationError(t('totp.errors.loginChallengeHasExpiredOrIsInvalid'))
    }

    await connectDB()

    const user = await User.findById(challenge.userId)

    if (!user) {
      throw new ValidationError(t('user.errors.notFound'))
    }

    const settings = await UserSettings.findOne({ userId: user._id })

    if (!settings || !settings.mfaEnabled || !settings.mfaSecret) {
      throw new ValidationError(t('totp.errors.mfaNotEnabledForThisUser'))
    }

    const secret = decryptSecret(settings.mfaSecret)

    const totpValid = await verifyTotpCode(secret, body.code, t)

    let backupUsed = false

    if (!totpValid.valid) {
      const { matched, remainingCodes } = await consumeBackupCode(body.code, settings.mfaBackupCodes)

      if (!matched) {
        throw new ValidationError(t('totp.errors.invalidRemainingBackupCode'))
      }

      settings.mfaBackupCodes = remainingCodes
      await settings.save()
      backupUsed = true
    }

    const authResponse = await authService.createAuthTokensForUser(user, { languageCode })

    const response = res.json(
      {
        success: true,
        user: authResponse.user,
        mfa: {
          usedBackupCode: backupUsed,
        },
      },
      { status: 200 },
    )

    setAuthCookies(response, authResponse.accessToken, authResponse.refreshToken, authResponse.expiresIn)

    return response
  })
}

export const POST = withGlobalRateLimit(handler)
