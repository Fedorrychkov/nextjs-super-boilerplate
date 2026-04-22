import connectDB from '@lib/db/client'
import User from '@lib/db/models/User'
import { verifyAccessToken } from '@lib/jwt/utils'
import { apiErrorHandlerContainer, withGlobalRateLimit } from '@lib/middleware'
import { NextRequest } from 'next/server'

import { UserStatus } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handler = (request: NextRequest) => {
  return apiErrorHandlerContainer(request)(async (res, req) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    const body = await req.json().catch(() => ({}))
    const accessToken = (body?.accessToken ?? '') as string

    if (!accessToken?.trim()) {
      return res.json({ message: t('auth.errors.accessTokenRequired') }, { status: 401 })
    }

    try {
      const payload = verifyAccessToken(accessToken)

      await connectDB()
      const userDoc = await User.findById(payload.sub).select('-password')

      if (!userDoc || userDoc.status !== UserStatus.ACTIVE) {
        return res.json({ message: t('user.errors.notFoundOrInactive') }, { status: 401 })
      }

      return res.json(
        {
          user: {
            id: userDoc._id.toString(),
            email: userDoc.email,
            role: userDoc.role,
            status: userDoc.status,
          },
        },
        { status: 200 },
      )
    } catch {
      return res.json({ message: t('auth.errors.invalidOrExpiredAccessToken') }, { status: 401 })
    }
  })
}

export const POST = withGlobalRateLimit(handler)
