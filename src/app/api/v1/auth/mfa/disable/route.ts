/* eslint-disable simple-import-sort/imports */
import connectDB from '@lib/db/client'
import User from '@lib/db/models/User'
import UserSettings from '@lib/db/models/UserSettings'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { decryptSecret, verifyTotpCode } from '@lib/security/totp'
import { NextRequest } from 'next/server'

import { ValidationError } from '@lib/error/custom-errors'
import { AuthSuccessResult } from '@lib/security/auth'

type DisableMfaDto = {
  code?: string
  password?: string
}

const handler = (request: NextRequest, authResult: AuthSuccessResult) => {
  return apiErrorHandlerContainer(request)(async (res, req) => {
    const body = (await req.json().catch(() => ({}))) as DisableMfaDto

    await connectDB()

    const user = await User.findById(authResult.payload.sub).select('+password')

    if (!user) {
      throw new ValidationError('User not found')
    }

    const settings = await UserSettings.findOne({ userId: user._id })

    if (!settings || !settings.mfaEnabled) {
      throw new ValidationError('MFA is not enabled for this user')
    }

    // Require password for extra safety
    if (!body.password) {
      throw new ValidationError('Password is required to disable MFA')
    }

    const passwordValid = await user.comparePassword(body.password)

    if (!passwordValid) {
      throw new ValidationError('Invalid password')
    }

    if (body.code && settings.mfaSecret) {
      const secret = decryptSecret(settings.mfaSecret)
      const totpValid = await verifyTotpCode(secret, body.code)

      if (!totpValid.valid) {
        throw new ValidationError('Invalid MFA code')
      }
    }

    settings.mfaEnabled = false
    settings.mfaSecret = null
    settings.mfaBackupCodes = []
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
