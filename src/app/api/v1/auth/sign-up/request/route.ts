import { FIRST_ADMIN_CONFIG, REGISTRATION_CONFIG } from '@config/env'
import { setAuthCookies } from '@lib/cookies'
import { apiErrorHandlerContainer, withGlobalRateLimit } from '@lib/middleware'
import { ensureCanRegister } from '@lib/security/bruteforce'
import { getClientKey } from '@lib/security/rate-limit'
import { authService } from '@lib/services/auth.service'
import { requestSignupCode } from '@lib/services/registration/sign-up-verification.service'
import { NextRequest, NextResponse } from 'next/server'

import { RegisterDto } from '~/api/auth/types'
import { getPreferredLanguageCodeFromAcceptLanguage } from '~/lib/i18n/detectLocale'
import { getServerTFromNextRequest } from '~/lib/i18n/server'

/** Match stored user emails (lowercase). */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function firstAdminLoginNormalized(): string | null {
  const login = FIRST_ADMIN_CONFIG.login?.trim()

  return login ? login.toLowerCase() : null
}

const handler = (request: NextRequest) => {
  return apiErrorHandlerContainer(request)(async (res, req) => {
    const { t } = getServerTFromNextRequest(request)
    const body: RegisterDto = await req.json()
    const languageCode = getPreferredLanguageCodeFromAcceptLanguage(req.headers.get('accept-language'))
    const ip = getClientKey(req)

    await ensureCanRegister(ip)

    const emailRaw = body.email?.trim() ?? ''
    const password = body.password ?? ''
    const emailNorm = normalizeEmail(emailRaw)
    const adminLogin = firstAdminLoginNormalized()

    /**
     * First admin (env): no email OTP — same as legacy sign-up.
     * Any other address goes through `requestSignupCode` + `/sign-up/complete`.
     */
    if (adminLogin && emailNorm === adminLogin && password !== FIRST_ADMIN_CONFIG.password) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const isValidFirstAdmin = Boolean(adminLogin && emailNorm === adminLogin && password === FIRST_ADMIN_CONFIG.password)

    if (isValidFirstAdmin || !REGISTRATION_CONFIG.mode) {
      const authResponse = await authService.register({ ...body, email: emailNorm }, isValidFirstAdmin, { languageCode, t })
      const response = res.json(
        {
          success: true,
          nextStep: 'logged_in' as const,
          message: t('user.messages.registeredSuccessfully'),
          user: authResponse.user,
        },
        { status: 201 },
      )

      setAuthCookies(response, authResponse.accessToken, authResponse.refreshToken, authResponse.expiresIn)

      return response
    }

    const { devCode } = await requestSignupCode({ email: emailRaw, password, locale: languageCode ?? undefined }, t)

    return res.json(
      {
        success: true,
        nextStep: 'verify' as const,
        message: t('auth.messages.signUpCodeSent'),
        ...(devCode !== undefined ? { devCode } : {}),
      },
      { status: 200 },
    )
  })
}

export const POST = withGlobalRateLimit(handler)
