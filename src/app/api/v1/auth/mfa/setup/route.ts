/* eslint-disable simple-import-sort/imports */
import connectDB from '@lib/db/client'
import User from '@lib/db/models/User'
import UserSettings from '@lib/db/models/UserSettings'
import { withGlobalRateLimit, apiErrorHandlerContainer } from '@lib/middleware'
import { encryptSecret, generateBackupCodes, generateTotpSecret, getOtpauthUrl, hashBackupCodes } from '@lib/security/totp'
import { NextRequest } from 'next/server'

import { ValidationError } from '@lib/error/custom-errors'
import { authMiddleware } from '@lib/security/auth'

const handler = (request: NextRequest) => {
  return apiErrorHandlerContainer(request)(async (res) => {
    const authResult = await authMiddleware(request)

    if (!authResult.success) {
      return authResult.response
    }

    await connectDB()

    const user = await User.findById(authResult.payload.sub)

    if (!user) {
      throw new ValidationError('User not found')
    }

    const secret = generateTotpSecret()
    const otpauthUrl = getOtpauthUrl(secret, user.email)

    const backupCodes = generateBackupCodes()
    const hashedBackupCodes = await hashBackupCodes(backupCodes)

    const encryptedSecret = encryptSecret(secret)

    await UserSettings.findOneAndUpdate(
      { userId: user._id },
      {
        userId: user._id,
        mfaSecret: encryptedSecret,
        mfaEnabled: false,
        mfaBackupCodes: hashedBackupCodes,
      },
      { upsert: true, new: true },
    )

    return res.json(
      {
        otpauthUrl,
        secret,
        backupCodes,
      },
      { status: 200 },
    )
  })
}

export const POST = withGlobalRateLimit(handler)
