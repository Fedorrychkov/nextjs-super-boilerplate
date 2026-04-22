import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { I18nService } from '@lib/services/i18n.service'
import { NextRequest, NextResponse } from 'next/server'

import type { I18nCreateLocaleDto, I18nLocalesResponse } from '~/api/i18n'
import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const i18nService = new I18nService()

const handlerGet = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const list = await i18nService.listLocales()
    const payload: I18nLocalesResponse = { list }

    return response.json(payload)
  })

const handlerPost = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const body = (await request.json()) as I18nCreateLocaleDto
    const locale = await i18nService.createLocale(body)

    return response.json(locale, { status: 201 })
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handlerGet))
export const POST = withGlobalRateLimit(withAuthMiddleware(handlerPost))
