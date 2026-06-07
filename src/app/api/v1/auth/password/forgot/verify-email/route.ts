import { apiErrorHandlerContainer, withGlobalRateLimit } from '@lib/middleware'
import { verifyForgotEmailCode } from '@lib/services/password/password-forgot.service'
import { NextRequest } from 'next/server'

import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handler = (request: NextRequest) =>
  apiErrorHandlerContainer(request)(async (res, req) => {
    const { t } = await getServerTFromNextRequestAsync(request)
    const body = await req.json()
    const { pendingId, emailCode } = body || {}

    const result = await verifyForgotEmailCode(
      {
        pendingId: String(pendingId ?? ''),
        emailCode: String(emailCode ?? ''),
      },
      t,
    )

    return res.json(result)
  })

export const POST = withGlobalRateLimit(handler)
