import connectDB from '@lib/db/client'
import UserSettings from '@lib/db/models/UserSettings'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { NextRequest, NextResponse } from 'next/server'

const handler = async (request: NextRequest, authResult: AuthSuccessResult) => {
  try {
    return apiErrorHandlerContainer(request)(async (res) => {
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

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
