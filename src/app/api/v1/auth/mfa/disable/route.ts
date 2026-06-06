import connectDB from '@lib/db/client'
import User from '@lib/db/models/User'
import UserSettings from '@lib/db/models/UserSettings'
import { ValidationError } from '@lib/error/custom-errors'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { decryptSecret, verifyTotpCode } from '@lib/security/totp'
import { notifyMfaDisabled } from '@lib/services/security-notification.service'
import { NextRequest } from 'next/server'

import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

type DisableMfaDto = {
  code?: string
  password?: string
}

const handler = (request: NextRequest, authResult: AuthSuccessResult) => {
  return apiErrorHandlerContainer(request)(async (res, req) => {
    const body = (await req.json().catch(() => ({}))) as DisableMfaDto

    const { t } = await getServerTFromNextRequestAsync(request)

    await connectDB()

    const user = await User.findById(authResult.payload.sub).select('+password')

    if (!user) {
      throw new ValidationError(t('user.errors.notFound'))
    }

    const settings = await UserSettings.findOne({ userId: user._id })

    if (!settings || !settings.mfaEnabled) {
      throw new ValidationError(t('totp.errors.mfaNotEnabledForThisUser'))
    }

    // Require password for extra safety
    if (!body.password) {
      throw new ValidationError(t('totp.errors.passwordIsRequiredToDisableMfa'))
    }

    const passwordValid = await user.comparePassword(body.password)

    if (!passwordValid) {
      throw new ValidationError(t('auth.errors.invalidPassword'))
    }

    if (body.code && settings.mfaSecret) {
      const secret = decryptSecret(settings.mfaSecret)
      const totpValid = await verifyTotpCode(secret, body.code, t)

      if (!totpValid.valid) {
        throw new ValidationError(t('totp.errors.invalidMfaCode'))
      }
    }

    settings.mfaEnabled = false
    settings.mfaSecret = null
    settings.mfaBackupCodes = []
    await settings.save()

    void notifyMfaDisabled({
      recipientUserId: user._id.toString(),
      t,
    })

    return res.json(
      {
        success: true,
      },
      { status: 200 },
    )
  })
}

export const POST = withGlobalRateLimit(withAuthMiddleware(handler))
