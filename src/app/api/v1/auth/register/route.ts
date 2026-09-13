import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { authService } from '@lib/services/auth.service'
import { NextRequest, NextResponse } from 'next/server'

import { RegisterDto } from '~/api/auth/types'
import { UserRole } from '~/api/user'
import { getPreferredLanguageCodeFromAcceptLanguage } from '~/lib/i18n/detectLocale'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

/**
 * Legacy admin-side registration, kept for external callers; `register-by-admin` is the
 * supported path. Three things changed: EDITOR may no longer create users, the password policy
 * applies (it only runs when `t` is passed), and the response no longer sets the NEW user's
 * cookies on the CALLER — that swapped the admin's session for the account just created.
 */
const handler = (request: NextRequest, authResult: AuthSuccessResult) => {
  return apiErrorHandlerContainer(request)(async (res, req) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (authResult.payload.role !== UserRole.ADMIN) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const body: RegisterDto = await req.json()
    const languageCode = getPreferredLanguageCodeFromAcceptLanguage(req.headers.get('accept-language'))

    const authResponse = await authService.register(body, false, { languageCode, t })

    return res.json(
      {
        success: true,
        message: t('user.messages.userRegisteredSuccessfully'),
        user: authResponse.user,
      },
      { status: 201 },
    )
  })
}

export const POST = withGlobalRateLimit(withAuthMiddleware(handler))
