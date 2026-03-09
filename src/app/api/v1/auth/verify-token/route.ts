import connectDB from '@lib/db/client'
import User from '@lib/db/models/User'
import { apiErrorHandlerContainer } from '@lib/error/api-error-handler'
import { verifyAccessToken } from '@lib/jwt/utils'
import { withGlobalRateLimit } from '@lib/rate-limit'
import { NextRequest } from 'next/server'

import { UserStatus } from '~/api/user'

const handler = (request: NextRequest) => {
  return apiErrorHandlerContainer(request)(async (res, req) => {
    const body = await req.json().catch(() => ({}))
    const accessToken = (body?.accessToken ?? '') as string

    if (!accessToken?.trim()) {
      return res.json({ message: 'Access token is required' }, { status: 401 })
    }

    try {
      const payload = verifyAccessToken(accessToken)

      await connectDB()
      const userDoc = await User.findById(payload.sub).select('-password')

      if (!userDoc || userDoc.status !== UserStatus.ACTIVE) {
        return res.json({ message: 'User not found or inactive' }, { status: 401 })
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
      return res.json({ message: 'Invalid or expired access token' }, { status: 401 })
    }
  })
}

export const POST = withGlobalRateLimit(handler)
