import connectDB from '@lib/db/client'
import UserSettings from '@lib/db/models/UserSettings'
import { apiErrorHandlerContainer, withGlobalRateLimit } from '@lib/middleware'
import { authMiddleware } from '@lib/security/auth'
import { NextRequest, NextResponse } from 'next/server'

const handler = async (request: NextRequest) => {
  try {
    return apiErrorHandlerContainer(request)(async (res) => {
      const authResult = await authMiddleware(request)

      if (!authResult.success) {
        return authResult.response
      }

      await connectDB()
      const settings = await UserSettings.findOne({ userId: authResult.payload.sub })

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
