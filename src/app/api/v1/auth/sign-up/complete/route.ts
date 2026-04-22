import { setAuthCookies } from '@lib/cookies'
import { apiErrorHandlerContainer, withGlobalRateLimit } from '@lib/middleware'
import { ensureCanRegister } from '@lib/security/bruteforce'
import { getClientKey } from '@lib/security/rate-limit'
import { authService } from '@lib/services/auth.service'
import { completeSignupWithCode } from '@lib/services/registration/sign-up-verification.service'
import { NextRequest } from 'next/server'

import { SignUpCompleteDto } from '~/api/auth/types'
import { getPreferredLanguageCodeFromAcceptLanguage } from '~/lib/i18n/detectLocale'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handler = (request: NextRequest) => {
  return apiErrorHandlerContainer(request)(async (res, req) => {
    const { t } = await getServerTFromNextRequestAsync(request)
    const body: SignUpCompleteDto = await req.json()
    const languageCode = getPreferredLanguageCodeFromAcceptLanguage(req.headers.get('accept-language'))
    const ip = getClientKey(req)

    await ensureCanRegister(ip)

    const { email, passwordHash } = await completeSignupWithCode(
      {
        email: body.email,
        code: body.code,
      },
      t,
    )

    const authResponse = await authService.registerWithVerifiedPasswordHash({ email, passwordHash }, { languageCode, t })

    const response = res.json(
      {
        success: true,
        message: t('user.messages.registeredSuccessfully'),
        user: authResponse.user,
      },
      { status: 201 },
    )

    setAuthCookies(response, authResponse.accessToken, authResponse.refreshToken, authResponse.expiresIn)

    return response
  })
}

export const POST = withGlobalRateLimit(handler)
