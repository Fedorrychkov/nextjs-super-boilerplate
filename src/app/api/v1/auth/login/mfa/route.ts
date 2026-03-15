/* eslint-disable simple-import-sort/imports */
import connectDB from '@lib/db/client'
import User from '@lib/db/models/User'
import UserSettings from '@lib/db/models/UserSettings'
import { setAuthCookies } from '@lib/cookies'
import { apiErrorHandlerContainer, withGlobalRateLimit } from '@lib/middleware'
import { consumeLoginChallenge } from '@lib/security/login-challenge'
import { consumeBackupCode, decryptSecret, verifyTotpCode } from '@lib/security/totp'
import { authService } from '@lib/services/auth.service'
import { NextRequest } from 'next/server'

import { ValidationError } from '@lib/error/custom-errors'

type MfaLoginDto = {
  challengeId: string
  code: string
}

const handler = (request: NextRequest) => {
  return apiErrorHandlerContainer(request)(async (res, req) => {
    const body = (await req.json()) as MfaLoginDto

    if (!body.challengeId || !body.code) {
      throw new ValidationError('challengeId and code are required')
    }

    const challenge = await consumeLoginChallenge(body.challengeId)

    if (!challenge) {
      throw new ValidationError('Login challenge has expired or is invalid')
    }

    await connectDB()

    const user = await User.findById(challenge.userId)

    if (!user) {
      throw new ValidationError('User not found')
    }

    const settings = await UserSettings.findOne({ userId: user._id })

    if (!settings || !settings.mfaEnabled || !settings.mfaSecret) {
      throw new ValidationError('MFA is not enabled for this user')
    }

    const secret = decryptSecret(settings.mfaSecret)

    const totpValid = await verifyTotpCode(secret, body.code)

    let backupUsed = false

    if (!totpValid.valid) {
      const { matched, remainingCodes } = await consumeBackupCode(body.code, settings.mfaBackupCodes)

      if (!matched) {
        throw new ValidationError('Invalid remaining backup code')
      }

      settings.mfaBackupCodes = remainingCodes
      await settings.save()
      backupUsed = true
    }

    const authResponse = await authService.createAuthTokensForUser(user)

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
