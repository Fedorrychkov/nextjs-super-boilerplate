import { apiErrorHandlerContainer, withGlobalRateLimit } from '@lib/middleware'
import { verifyForgotTotp } from '@lib/services/password/password-forgot.service'
import { NextRequest } from 'next/server'

import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handler = (request: NextRequest) =>
  apiErrorHandlerContainer(request)(async (res, req) => {
    const { t } = await getServerTFromNextRequestAsync(request)
    const body = await req.json()
    const { pendingId, totp } = body || {}

    const result = await verifyForgotTotp(
      {
        pendingId: String(pendingId ?? ''),
        totp: String(totp ?? ''),
      },
      t,
    )

    return res.json(result)
  })

export const POST = withGlobalRateLimit(handler)
