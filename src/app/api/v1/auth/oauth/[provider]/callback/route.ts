import type { OAuthProviderId } from '@config/auth-oauth'
import { ValidationError } from '@lib/error/custom-errors'
import { RouteHandlerContext, withGlobalRateLimit } from '@lib/middleware'
import { processOAuthCallback } from '@lib/oauth/oauth-callback.service'
import { isKnownOAuthProvider } from '@lib/oauth/registry'
import { withOAuthBrowserHandler } from '@lib/oauth/with-oauth-browser-handler'
import { getClientKey } from '@lib/security/rate-limit'
import { getRequestClientMeta } from '@lib/utils/request-client-meta'
import { NextRequest } from 'next/server'

import { getPreferredLanguageCodeFromAcceptLanguage } from '~/lib/i18n/detectLocale'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handler = (request: NextRequest, context: RouteHandlerContext) =>
  withOAuthBrowserHandler(request, 'auth', async () => {
    const paramsData = await context.params
    const providerRaw = typeof paramsData.provider === 'string' ? paramsData.provider : undefined
    const { t } = await getServerTFromNextRequestAsync(request)

    if (!providerRaw || !isKnownOAuthProvider(providerRaw)) {
      throw new ValidationError(t('auth.oauth.errors.unknownProvider'))
    }

    const provider = providerRaw.toLowerCase() as OAuthProviderId
    const sp = request.nextUrl.searchParams

    return processOAuthCallback({
      provider,
      code: sp.get('code'),
      state: sp.get('state'),
      deviceId: sp.get('device_id'),
      error: sp.get('error'),
      intent: 'auth',
      clientMeta: getRequestClientMeta(request),
      languageCode: getPreferredLanguageCodeFromAcceptLanguage(request.headers.get('accept-language')),
      t,
      ip: getClientKey(request),
      userAgent: request.headers.get('user-agent'),
    })
  })

export const GET = withGlobalRateLimit(handler)
