import type { OAuthProviderId } from '@config/auth-oauth'
import { ValidationError } from '@lib/error/custom-errors'
import { RouteHandlerContext, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { buildOAuthStartRedirect } from '@lib/oauth/oauth-start.service'
import { isKnownOAuthProvider } from '@lib/oauth/registry'
import { withOAuthBrowserHandler } from '@lib/oauth/with-oauth-browser-handler'
import type { AuthSuccessResult } from '@lib/security/auth'
import { NextRequest, NextResponse } from 'next/server'

import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handlerGet = (request: NextRequest, authResult: AuthSuccessResult, context?: RouteHandlerContext) =>
  withOAuthBrowserHandler(request, 'link', async () => {
    const paramsData = context ? await context.params : undefined
    const providerRaw = typeof paramsData?.provider === 'string' ? paramsData.provider : undefined
    const { t } = await getServerTFromNextRequestAsync(request)

    if (!providerRaw || !isKnownOAuthProvider(providerRaw)) {
      throw new ValidationError(t('auth.oauth.errors.unknownProvider'))
    }

    const provider = providerRaw.toLowerCase() as OAuthProviderId
    const url = await buildOAuthStartRedirect({
      provider,
      flow: 'link',
      actorUserId: authResult.payload.sub,
    })

    return NextResponse.redirect(url)
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handlerGet))
