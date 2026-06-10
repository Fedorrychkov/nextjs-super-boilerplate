import type { OAuthProviderId } from '@config/auth-oauth'
import { ValidationError } from '@lib/error/custom-errors'
import { apiErrorHandlerContainer, RouteHandlerContext, withGlobalRateLimit } from '@lib/middleware'
import { processOAuthCallback } from '@lib/oauth/oauth-callback.service'
import { isKnownOAuthProvider } from '@lib/oauth/registry'
import { getClientKey } from '@lib/security/rate-limit'
import { getRequestClientMeta } from '@lib/utils/request-client-meta'
import { NextRequest } from 'next/server'

import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handler = (request: NextRequest, context: RouteHandlerContext) =>
  apiErrorHandlerContainer(request)(async () => {
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
      intent: 'link',
      clientMeta: getRequestClientMeta(request),
      t,
      ip: getClientKey(request),
      userAgent: request.headers.get('user-agent'),
    })
  })

export const GET = withGlobalRateLimit(handler)
