import { ValidationError } from '@lib/error/custom-errors'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { I18nService } from '@lib/services/i18n.service'
import { NextRequest, NextResponse } from 'next/server'

import type { I18nBatchUpsertTranslationsDto, I18nBatchUpsertTranslationsResponse } from '~/api/i18n'
import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const i18nService = new I18nService()

const handlerPost = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const body = (await request.json()) as I18nBatchUpsertTranslationsDto
    const items = Array.isArray(body.items) ? body.items : []

    if (!items.length) {
      throw new ValidationError('items are required')
    }

    const localeCode = String(items[0]?.localeCode ?? '').trim()

    if (!localeCode) {
      throw new ValidationError('localeCode is required')
    }

    if (items.some((i) => String(i?.localeCode ?? '').trim() !== localeCode)) {
      throw new ValidationError('all items must have the same localeCode')
    }

    const list = []
    for (const item of items) {
      const saved = await i18nService.upsertTranslation(item, authResult.payload.sub)
      list.push({ key: item.key, saved })
    }

    const payload: I18nBatchUpsertTranslationsResponse = {
      localeCode,
      updatedCount: list.length,
      list,
    }

    return response.json(payload)
  })

export const POST = withGlobalRateLimit(withAuthMiddleware(handlerPost))
