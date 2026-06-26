import type { OAuthProviderId } from '@config/auth-oauth'
import { ValidationError } from '@lib/error/custom-errors'
import { RouteHandlerContext, withGlobalRateLimit } from '@lib/middleware'
import { assertOAuthFlow } from '@lib/oauth/oauth-flow.service'
import { buildOAuthStartRedirect } from '@lib/oauth/oauth-start.service'
import { isKnownOAuthProvider } from '@lib/oauth/registry'
import { withOAuthBrowserHandler } from '@lib/oauth/with-oauth-browser-handler'
import { NextRequest, NextResponse } from 'next/server'

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
    const flow = assertOAuthFlow(request.nextUrl.searchParams.get('flow'))
    const nextPath = request.nextUrl.searchParams.get('nextPath')

    const url = await buildOAuthStartRedirect({
      provider,
      flow,
      nextPath,
    })

    return NextResponse.redirect(url)
  })

export const GET = withGlobalRateLimit(handler)
