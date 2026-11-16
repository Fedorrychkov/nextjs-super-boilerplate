import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { platformSettingsService } from '@lib/services/platform-settings.service'
import { NextRequest, NextResponse } from 'next/server'

import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

/** Every platform setting with its spec and current value; secrets only as set / not set. ADMIN only. */
const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (authResult.payload.role !== UserRole.ADMIN) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    return response.json({ items: await platformSettingsService.list() })
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
