import connectDB from '@lib/db/client'
import User from '@lib/db/models/User'
import UserSettings from '@lib/db/models/UserSettings'
import { ValidationError } from '@lib/error/custom-errors'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { decryptSecret, verifyTotpCode } from '@lib/security/totp'
import { NextRequest } from 'next/server'

import { getServerTFromNextRequest } from '~/lib/i18n/server'

type ConfirmMfaDto = {
  code: string
}

const handler = (request: NextRequest, authResult: AuthSuccessResult) => {
  return apiErrorHandlerContainer(request)(async (res, req) => {
    const body = (await req.json()) as ConfirmMfaDto

    const { t } = getServerTFromNextRequest(request)

    if (!body.code) {
      throw new ValidationError(t('totp.errors.mfaIsRequired'))
    }

    await connectDB()

    const user = await User.findById(authResult.payload.sub)

    if (!user) {
      throw new ValidationError(t('user.errors.notFound'))
    }

    const settings = await UserSettings.findOne({ userId: user._id })

    if (!settings || !settings.mfaSecret) {
      throw new ValidationError(t('totp.errors.mfaIsNotInitializedForThisUser'))
    }

    const secret = decryptSecret(settings.mfaSecret)

    const totpValid = await verifyTotpCode(secret, body.code, t)

    if (!totpValid.valid) {
      throw new ValidationError(t('totp.errors.invalidCode'))
    }

    settings.mfaEnabled = true
    await settings.save()

    return res.json(
      {
        success: true,
      },
      { status: 200 },
    )
  })
}

export const POST = withGlobalRateLimit(withAuthMiddleware(handler))
