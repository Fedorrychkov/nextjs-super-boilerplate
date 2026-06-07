import { apiErrorHandlerContainer, withGlobalRateLimit } from '@lib/middleware'
import { completePasswordForgot } from '@lib/services/password/password-forgot.service'
import { NextRequest } from 'next/server'

import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handler = (request: NextRequest) =>
  apiErrorHandlerContainer(request)(async (res, req) => {
    const { t } = await getServerTFromNextRequestAsync(request)
    const body = await req.json()
    const { pendingId, newPassword, emailCode, totp, flexibleFactor } = body || {}

    const result = await completePasswordForgot(
      {
        pendingId: String(pendingId ?? ''),
        newPassword: String(newPassword ?? ''),
        emailCode: emailCode ? String(emailCode) : undefined,
        totp: totp ? String(totp) : undefined,
        flexibleFactor: flexibleFactor === 'email' || flexibleFactor === 'totp' ? flexibleFactor : undefined,
      },
      t,
    )

    return res.json(result)
  })

export const POST = withGlobalRateLimit(handler)
