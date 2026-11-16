import { apiErrorHandlerContainer, RouteHandlerContext, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { platformSettingsService } from '@lib/services/platform-settings.service'
import { NextRequest, NextResponse } from 'next/server'

import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

/**
 * Change one platform setting: `{ value }`, `null` — back to the default. ADMIN only; every
 * change lands in the security audit log. An invalid value answers 400 with a `code` the admin
 * renders next to the field.
 */
const handler = (request: NextRequest, authResult: AuthSuccessResult, context?: RouteHandlerContext) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (authResult.payload.role !== UserRole.ADMIN) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const params = context ? await context.params : undefined
    const key = typeof params?.key === 'string' ? decodeURIComponent(params.key) : ''
    const body = (await request.json().catch(() => null)) as { value?: unknown } | null

    if (!body || !('value' in body)) {
      return NextResponse.json({ message: t('platformSettings.errors.valueRequired') }, { status: 400 })
    }

    return response.json(await platformSettingsService.set(key, body.value, authResult.payload.sub))
  })

export const PUT = withGlobalRateLimit(withAuthMiddleware(handler))
