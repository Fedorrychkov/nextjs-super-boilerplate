import connectDB from '@lib/db/client'
import UserSettings from '@lib/db/models/UserSettings'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { NextRequest, NextResponse } from 'next/server'

import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handler = async (request: NextRequest, authResult: AuthSuccessResult) => {
  const { t } = await getServerTFromNextRequestAsync(request)

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
    return NextResponse.json({ message: t('auth.errors.invalidToken') }, { status: 401 })
  }
}

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
