import connectDB from '@lib/db/client'
import User from '@lib/db/models/User'
import UserSettings from '@lib/db/models/UserSettings'
import { ValidationError } from '@lib/error/custom-errors'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { encryptSecret, generateBackupCodes, generateTotpSecret, getOtpauthUrl, hashBackupCodes } from '@lib/security/totp'
import { NextRequest } from 'next/server'

import { getServerTFromNextRequest } from '~/lib/i18n/server'

const handler = (request: NextRequest, authResult: AuthSuccessResult) => {
  return apiErrorHandlerContainer(request)(async (res) => {
    const { t } = getServerTFromNextRequest(request)

    await connectDB()

    const user = await User.findById(authResult.payload.sub)

    if (!user) {
      throw new ValidationError(t('user.errors.notFound'))
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

export const POST = withGlobalRateLimit(withAuthMiddleware(handler))
