import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { confirmPasswordChange, requestPasswordChange } from '@lib/services/password/password-change.service'
import { NextRequest } from 'next/server'

import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handlerRequest = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (res, req) => {
    const { t } = await getServerTFromNextRequestAsync(request)
    const body = await req.json()
    const { currentPassword, newPassword } = body || {}

    const result = await requestPasswordChange(
      {
        userId: authResult.payload.sub,
        currentPassword: String(currentPassword ?? ''),
        newPassword: String(newPassword ?? ''),
      },
      t,
    )

    return res.json({ ok: true, ...result })
  })

const handlerConfirm = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (res, req) => {
    const { t } = await getServerTFromNextRequestAsync(request)
    const body = await req.json()
    const { pendingId, emailCode, totp, flexibleFactor } = body || {}

    const result = await confirmPasswordChange(
      {
        userId: authResult.payload.sub,
        pendingId: String(pendingId ?? ''),
        emailCode: emailCode ? String(emailCode) : undefined,
        totp: totp ? String(totp) : undefined,
        flexibleFactor: flexibleFactor === 'email' || flexibleFactor === 'totp' ? flexibleFactor : undefined,
      },
      t,
    )

    return res.json(result)
  })

export const POST = withGlobalRateLimit(withAuthMiddleware(handlerRequest))
export const PUT = withGlobalRateLimit(withAuthMiddleware(handlerConfirm))
