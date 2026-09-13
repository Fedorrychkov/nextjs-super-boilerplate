import crypto from 'node:crypto'

import { FIRST_ADMIN_CONFIG, REGISTRATION_CONFIG } from '@config/env'
import { setAuthCookies } from '@lib/cookies'
import connectDB from '@lib/db/client'
import User from '@lib/db/models/User'
import { apiErrorHandlerContainer, withGlobalRateLimit } from '@lib/middleware'
import { assertLoginNotBlocked, ensureCanRegister, recordLoginFailure } from '@lib/security/bruteforce'
import { getClientKey } from '@lib/security/rate-limit'
import { authService } from '@lib/services/auth.service'
import { requestSignupCode } from '@lib/services/registration/sign-up-verification.service'
import { getRequestClientMeta } from '@lib/utils/request-client-meta'
import { NextRequest } from 'next/server'

import { RegisterDto } from '~/api/auth/types'
import { UserRole } from '~/api/user'
import { resolveFirstAdminBranch } from '~/lib/auth/firstAdmin'
import { getPreferredLanguageCodeFromAcceptLanguage } from '~/lib/i18n/detectLocale'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

/** Match stored user emails (lowercase). */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function firstAdminLoginNormalized(): string | null {
  const login = FIRST_ADMIN_CONFIG.login?.trim()

  return login ? login.toLowerCase() : null
}

/** Constant-time comparison: a plain `!==` leaks the matching prefix length through timing. */
function safeEqualUtf8(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')

  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)
}

const handler = (request: NextRequest) => {
  return apiErrorHandlerContainer(request)(async (res, req) => {
    const { t } = await getServerTFromNextRequestAsync(request)
    const body: RegisterDto = await req.json()
    const languageCode = getPreferredLanguageCodeFromAcceptLanguage(req.headers.get('accept-language'))
    const ip = getClientKey(req)

    await ensureCanRegister(ip)

    const emailRaw = body.email?.trim() ?? ''
    const password = body.password ?? ''
    const emailNorm = normalizeEmail(emailRaw)
    const adminLogin = firstAdminLoginNormalized()

    /**
     * First admin (env): no email OTP — but only while the database has no ADMIN. The public form
     * used to answer 403 for a wrong admin password and 400 "already exists" for the right one,
     * which made it an oracle for both the admin's email and password. Now a mismatch is not an
     * error: the request continues down the ordinary path and gets the same answer as any other
     * address. A wrong bootstrap password counts against the login brute-force limits.
     */
    const emailMatches = Boolean(adminLogin && emailNorm === adminLogin)
    let adminExists = true

    if (emailMatches) {
      await connectDB()
      adminExists = Boolean(await User.exists({ role: UserRole.ADMIN }))
    }

    const passwordMatches = emailMatches && !adminExists && safeEqualUtf8(password, FIRST_ADMIN_CONFIG.password ?? '')

    if (emailMatches && !adminExists && !passwordMatches) {
      await assertLoginNotBlocked(ip, emailNorm)
      await recordLoginFailure(ip, emailNorm)
    }

    const isValidFirstAdmin = resolveFirstAdminBranch({ adminExists, emailMatches, passwordMatches }) === 'bootstrap'

    if (isValidFirstAdmin || !REGISTRATION_CONFIG.mode) {
      const authResponse = await authService.register({ ...body, email: emailNorm }, isValidFirstAdmin, {
        languageCode,
        clientMeta: getRequestClientMeta(req),
        t,
      })
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
