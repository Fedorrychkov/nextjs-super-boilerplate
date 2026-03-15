/* eslint-disable simple-import-sort/imports */
import connectDB from '@lib/db/client'
import User from '@lib/db/models/User'
import UserSettings from '@lib/db/models/UserSettings'
import { apiErrorHandlerContainer, withGlobalRateLimit } from '@lib/middleware'
import { decryptSecret, verifyTotpCode } from '@lib/security/totp'
import { NextRequest } from 'next/server'

import { ValidationError } from '@lib/error/custom-errors'
import { authMiddleware } from '@lib/security/auth'

type ConfirmMfaDto = {
  code: string
}

const handler = (request: NextRequest) => {
  return apiErrorHandlerContainer(request)(async (res, req) => {
    const authResult = await authMiddleware(request)

    if (!authResult.success) {
      return authResult.response
    }

    const body = (await req.json()) as ConfirmMfaDto

    if (!body.code) {
      throw new ValidationError('MFA code is required')
    }

    await connectDB()

    const user = await User.findById(authResult.payload.sub)

    if (!user) {
      throw new ValidationError('User not found')
    }

    const settings = await UserSettings.findOne({ userId: user._id })

    if (!settings || !settings.mfaSecret) {
      throw new ValidationError('MFA is not initialized for this user')
    }

    const secret = decryptSecret(settings.mfaSecret)

    const valid = verifyTotpCode(secret, body.code)

    if (!valid) {
      throw new ValidationError('Invalid MFA code')
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

export const POST = withGlobalRateLimit(handler)
