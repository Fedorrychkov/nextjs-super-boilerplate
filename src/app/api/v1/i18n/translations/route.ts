import { ValidationError } from '@lib/error/custom-errors'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { I18nService } from '@lib/services/i18n.service'
import { NextRequest, NextResponse } from 'next/server'

import type { I18nTranslationListResponse, I18nUpsertTranslationDto, I18nUpsertTranslationResponse } from '~/api/i18n'
import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const i18nService = new I18nService()

const handlerGet = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const localeCode = request.nextUrl.searchParams.get('locale')

    if (!localeCode?.trim()) {
      throw new ValidationError('locale query parameter is required')
    }

    const result = await i18nService.listTranslations(localeCode)
    const payload: I18nTranslationListResponse = result

    return response.json(payload)
  })

const handlerPut = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const body = (await request.json()) as I18nUpsertTranslationDto
    const saved = await i18nService.upsertTranslation(body, authResult.payload.sub)
    const payload: I18nUpsertTranslationResponse = {
      localeCode: body.localeCode,
      key: body.key,
      saved,
    }

    return response.json(payload)
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handlerGet))
export const PUT = withGlobalRateLimit(withAuthMiddleware(handlerPut))
