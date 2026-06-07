import { apiErrorHandlerContainer, withGlobalRateLimit } from '@lib/middleware'
import { startPasswordForgot } from '@lib/services/password/password-forgot.service'
import { NextRequest } from 'next/server'

import { getPreferredLanguageCodeFromAcceptLanguage } from '~/lib/i18n/detectLocale'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handler = (request: NextRequest) =>
  apiErrorHandlerContainer(request)(async (res, req) => {
    const { t } = await getServerTFromNextRequestAsync(request)
    const body = await req.json()
    const { email } = body || {}
    const locale = getPreferredLanguageCodeFromAcceptLanguage(req.headers.get('accept-language'))

    const result = await startPasswordForgot({ email: String(email ?? ''), locale }, t)

    return res.json({ ok: true, ...result })
  })

export const POST = withGlobalRateLimit(handler)
