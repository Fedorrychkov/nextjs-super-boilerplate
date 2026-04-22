import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { I18nService } from '@lib/services/i18n.service'
import { NextRequest, NextResponse } from 'next/server'

import type { I18nSyncLocalesFromFilesResponse } from '~/api/i18n'
import { UserRole } from '~/api/user'
import { SUPPORTED_LOCALES } from '~/lib/i18n/config'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const i18nService = new I18nService()

const handlerPost = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const list = await i18nService.syncLocalesFromCodeFiles()
    const payload: I18nSyncLocalesFromFilesResponse = {
      list,
      syncedCodes: [...SUPPORTED_LOCALES],
    }

    return response.json(payload, { status: 200 })
  })

export const POST = withGlobalRateLimit(withAuthMiddleware(handlerPost))
