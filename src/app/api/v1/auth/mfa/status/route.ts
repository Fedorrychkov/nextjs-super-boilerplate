import connectDB from '@lib/db/client'
import UserSettings from '@lib/db/models/UserSettings'
import { apiErrorHandlerContainer } from '@lib/error/api-error-handler'
import { verifyAccessToken } from '@lib/jwt/utils'
import { authMiddleware } from '@lib/middleware/auth.middleware'
import { withGlobalRateLimit } from '@lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

const handler = async (request: NextRequest) => {
  const authResult = await authMiddleware(request)

  if (!authResult.success) {
    return authResult.response
  }

  try {
    const payload = verifyAccessToken(authResult.payload.sub)

    return apiErrorHandlerContainer(request)(async (res) => {
      await connectDB()
      const settings = await UserSettings.findOne({ userId: payload.sub })

      return res.json(
        {
          mfaEnabled: !!settings?.mfaEnabled,
        },
        { status: 200 },
      )
    })
  } catch {
    return NextResponse.json({ message: 'Invalid or expired token' }, { status: 401 })
  }
}

export const GET = withGlobalRateLimit(handler)
